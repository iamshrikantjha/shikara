package com.shikara.torrent

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.libtorrent4j.AlertListener
import org.libtorrent4j.Priority
import org.libtorrent4j.SessionManager
import org.libtorrent4j.SessionParams
import org.libtorrent4j.SettingsPack
import org.libtorrent4j.TorrentFlags
import org.libtorrent4j.TorrentHandle
import org.libtorrent4j.TorrentInfo
import org.libtorrent4j.TorrentStatus
import org.libtorrent4j.alerts.AddTorrentAlert
import org.libtorrent4j.alerts.Alert
import org.libtorrent4j.alerts.AlertType
import org.libtorrent4j.alerts.MetadataReceivedAlert
import java.io.File
import java.util.concurrent.ConcurrentHashMap

/**
 * Single process-wide wrapper around libtorrent4j's [SessionManager].
 *
 * docs/03-Phase3-Torrent-Streaming.md §5 — the JS-facing API (§5.1) is
 * per-torrentId, but there is exactly one underlying libtorrent session for
 * the whole app; this object is that session plus the bookkeeping needed to
 * map a `torrentId` (the magnet's infohash, lowercase hex) to its
 * [TorrentHandle] and to the file-selection/read-ahead state described in
 * §5.2.
 */
object TorrentSession {

    private const val TAG = "ShikaraTorrent"

    // How many pieces past the current playback position get a near-term
    // deadline — the "read-ahead window" (docs §5.2), not a flat sequential
    // download of the whole file.
    private const val READ_AHEAD_PIECES = 24
    private const val PIECE_DEADLINE_STEP_MS = 250

    private var session: SessionManager? = null
    private val handles = ConcurrentHashMap<String, TorrentHandle>()

    // A fileIndex requested via setFilePriority() before metadata arrived —
    // applied once METADATA_RECEIVED fires. Cleared once applied.
    private val requestedFileIndex = ConcurrentHashMap<String, Int>()

    // The file index actually selected for streaming, once known — needed by
    // updatePlaybackPosition() to recompute the read-ahead window on seek.
    private val selectedFileIndex = ConcurrentHashMap<String, Int>()

    @Synchronized
    private fun ensureStarted(): SessionManager {
        var s = session
        if (s == null) {
            val sp = SettingsPack()
            sp.setEnableDht(true)
            sp.setEnableLsd(true)
            sp.setDhtBootstrapNodes("router.bittorrent.com:6881,dht.transmissionbt.com:6881,router.utorrent.com:6881,dht.libtorrent.org:25401,dht.aelitis.com:6881")
            sp.listenInterfaces("0.0.0.0:6881,[::]:6881,0.0.0.0:0,[::]:0")
            sp.connectionsLimit(200)
            sp.activeDownloads(10)
            sp.maxPeerlistSize(1000)
            sp.stopTrackerTimeout(1)

            val params = SessionParams(sp)
            s = SessionManager()
            s.addListener(SessionAlertListener())
            s.start(params)
            if (!s.isDhtRunning) {
                s.startDht()
            }
            session = s
            Log.i(TAG, "Torrent session started with DHT and dynamic port binding")
        }
        return s
    }

    // GET torrentId from a magnet URI's btih without waiting for any alert —
    // BEP 9 allows both a 40-char hex infohash and a 32-char base32 one; both
    // are normalized to lowercase hex so map lookups are consistent
    // regardless of which form an addon's magnet used.
    private val MAGNET_BTIH = Regex("(?i)urn:btih:([a-z0-9]{32}|[a-f0-9]{40})")

    private fun infoHashFromMagnet(uri: String): String? {
        val raw = MAGNET_BTIH.find(uri)?.groupValues?.get(1) ?: return null
        return when (raw.length) {
            40 -> raw.lowercase()
            32 -> base32Decode(raw).joinToString("") { "%02x".format(it) }
            else -> null
        }
    }

    private const val BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

    private fun base32Decode(input: String): ByteArray {
        var buffer = 0L
        var bitsLeft = 0
        val out = ArrayList<Byte>()
        for (c in input.uppercase()) {
            val value = BASE32_ALPHABET.indexOf(c)
            if (value < 0) continue
            buffer = (buffer shl 5) or value.toLong()
            bitsLeft += 5
            if (bitsLeft >= 8) {
                bitsLeft -= 8
                out.add(((buffer shr bitsLeft) and 0xFF).toByte())
            }
        }
        return out.toByteArray()
    }

    fun addMagnet(uri: String, saveDir: File): String {
        val torrentId = infoHashFromMagnet(uri)
            ?: throw IllegalArgumentException("Not a valid magnet URI (missing btih)")
        val s = ensureStarted()
        // SEQUENTIAL_DOWNLOAD biases toward download order rather than
        // rarest-first, which combines with the explicit piece-deadline
        // read-ahead window (applyReadAheadWindow) to make the file playable
        // before it's 100% downloaded (docs §5.2).
        s.download(uri, saveDir, TorrentFlags.SEQUENTIAL_DOWNLOAD)
        return torrentId
    }

    fun addTorrent(torrentFilePath: String, saveDir: File): String {
        val ti = TorrentInfo(File(torrentFilePath))
        val torrentId = ti.infoHash().toHex().lowercase()
        val s = ensureStarted()
        s.download(ti, saveDir, null, null, null, TorrentFlags.SEQUENTIAL_DOWNLOAD)
        return torrentId
    }

    // Torrents auto-resume as soon as they're added (see SessionAlertListener's
    // ADD_TORRENT handling below) — start() is kept as its own documented
    // method (docs §5.1) but is equivalent to resume() here.
    fun start(torrentId: String) = resume(torrentId)

    fun pause(torrentId: String) {
        handles[torrentId]?.pause()
    }

    fun resume(torrentId: String) {
        handles[torrentId]?.resume()
    }

    // libtorrent has no separate "stopped" state distinct from "paused" — a
    // stopped torrent is just paused and left registered so start()/resume()
    // can bring it back without re-fetching metadata.
    fun stop(torrentId: String) = pause(torrentId)

    fun remove(torrentId: String) {
        val handle = handles.remove(torrentId) ?: return
        session?.remove(handle)
        requestedFileIndex.remove(torrentId)
        selectedFileIndex.remove(torrentId)
    }

    fun setFilePriority(torrentId: String, fileIndex: Int, priority: Int) {
        val handle = handles[torrentId]
        val ti = handle?.torrentFile()
        if (handle == null || ti == null) {
            // Metadata not ready yet — remember it for applyFileSelection()
            // once METADATA_RECEIVED fires (docs §5.2).
            requestedFileIndex[torrentId] = fileIndex
            return
        }
        if (priority >= Priority.TOP_PRIORITY.swig().toInt()) {
            // "This is THE file to stream" — every other file drops to
            // IGNORE, matching addMagnet's single-file-selection behavior
            // rather than layering an arbitrary extra priority on top.
            selectFile(handle, ti, fileIndex)
        } else {
            handle.filePriority(fileIndex, Priority.fromSwig(priority))
        }
    }

    // Player seeking into an unbuffered region must re-prioritize pieces
    // around the new position (docs §5.2) — not part of §5.1's literal API
    // list, but required by §5.2's behavior; the Player (item 5) calls this
    // on seek.
    fun updatePlaybackPosition(torrentId: String, fileByteOffset: Long) {
        val handle = handles[torrentId] ?: return
        val ti = handle.torrentFile() ?: return
        val fileIndex = selectedFileIndex[torrentId] ?: return
        applyReadAheadWindow(handle, ti, fileIndex, fileByteOffset)
    }

    // The file the Player (item 5) currently has selected for a torrent, if
    // known yet — used to compute the read-ahead window on seek.
    fun getSelectedFileIndex(torrentId: String): Int? = selectedFileIndex[torrentId]

    data class StreamFile(val filePath: String, val fileSize: Long)

    // Absolute on-disk path + size for the selected file — TorrentDataSource
    // (docs §5.3) reads directly from this path, gated on piece availability
    // below, rather than through libtorrent at all.
    fun getStreamFile(torrentId: String, fileIndex: Int): StreamFile? {
        val handle = handles[torrentId] ?: return null
        val ti = handle.torrentFile() ?: return null
        if (fileIndex !in 0 until ti.numFiles()) return null
        val files = ti.files()
        return StreamFile(
            filePath = files.filePath(fileIndex, handle.savePath()),
            fileSize = files.fileSize(fileIndex),
        )
    }

    // Which piece a given byte offset within a file falls in — uses
    // FileStorage.mapFile rather than manual piece-length arithmetic so
    // multi-file torrents and pad files are handled correctly.
    fun pieceIndexForFileOffset(torrentId: String, fileIndex: Int, offsetInFile: Long): Int? {
        val handle = handles[torrentId] ?: return null
        val ti = handle.torrentFile() ?: return null
        if (fileIndex !in 0 until ti.numFiles()) return null
        return ti.files().mapFile(fileIndex, offsetInFile, 1).piece()
    }

    fun isPieceAvailable(torrentId: String, pieceIndex: Int): Boolean = handles[torrentId]?.havePiece(pieceIndex) ?: false

    // Blocks the CALLING thread — must only be called from Media3's loading
    // thread, never the main/UI thread — until the piece downloads or
    // timeoutMs elapses. Also bumps the piece to immediate priority: a read
    // blocked on it means playback needs it right now, regardless of where it
    // sits in the general read-ahead window (docs §5.2).
    fun awaitPiece(torrentId: String, pieceIndex: Int, timeoutMs: Long): Boolean {
        val handle = handles[torrentId] ?: return false
        if (handle.havePiece(pieceIndex)) return true
        handle.setPieceDeadline(pieceIndex, 0)
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (handle.havePiece(pieceIndex)) return true
            Thread.sleep(100)
        }
        return handle.havePiece(pieceIndex)
    }

    fun getStatus(torrentId: String): WritableMap {
        val map = Arguments.createMap()
        val status = handles[torrentId]?.status()
        map.putDouble("progress", status?.progress()?.toDouble() ?: 0.0)
        map.putDouble("downloadSpeed", status?.downloadRate()?.toDouble() ?: 0.0)
        map.putInt("peers", status?.numPeers() ?: 0)
        map.putString("state", stateToString(status?.state()))
        return map
    }

    fun getProgress(torrentId: String): Double = handles[torrentId]?.status()?.progress()?.toDouble() ?: 0.0

    fun getFiles(torrentId: String): WritableArray {
        val out = Arguments.createArray()
        val handle = handles[torrentId] ?: return out
        val ti = handle.torrentFile() ?: return out
        val files = ti.files()
        val progress = handle.fileProgress()
        for (i in 0 until files.numFiles()) {
            val file = Arguments.createMap()
            file.putInt("index", i)
            file.putString("path", files.filePath(i))
            file.putDouble("size", files.fileSize(i).toDouble())
            val downloaded = if (i < progress.size) progress[i] else 0L
            val size = files.fileSize(i)
            file.putDouble("progress", if (size > 0) downloaded.toDouble() / size.toDouble() else 0.0)
            out.pushMap(file)
        }
        return out
    }

    fun getPeers(torrentId: String): WritableArray {
        val out = Arguments.createArray()
        val handle = handles[torrentId] ?: return out
        for (peer in handle.peerInfo()) {
            val map = Arguments.createMap()
            map.putString("ip", peer.ip())
            map.putString("client", peer.client())
            map.putDouble("downloadSpeed", peer.downSpeed().toDouble())
            map.putDouble("uploadSpeed", peer.upSpeed().toDouble())
            map.putDouble("progress", peer.progress().toDouble())
            out.pushMap(map)
        }
        return out
    }

    // Backs the "Clear streaming cache" button (docs §3.3) — beyond §5.1's
    // literal list, but this is the only place that actually knows the save
    // directory. src/context/SettingsContext.tsx's clearStreamingCache() is
    // still a stub; wiring it to this native call is item 6's job.
    fun clearCache(saveDir: File) {
        saveDir.listFiles()?.forEach { it.deleteRecursively() }
    }

    private fun selectFile(handle: TorrentHandle, ti: TorrentInfo, fileIndex: Int) {
        val numFiles = ti.numFiles()
        if (fileIndex !in 0 until numFiles) return
        val priorities = Priority.array(Priority.IGNORE, numFiles)
        priorities[fileIndex] = Priority.TOP_PRIORITY
        handle.prioritizeFiles(priorities)
        val torrentId = handle.infoHash().toHex().lowercase()
        selectedFileIndex[torrentId] = fileIndex
        requestedFileIndex.remove(torrentId)
        applyReadAheadWindow(handle, ti, fileIndex, 0L)
    }

    // Runs once metadata is known (from METADATA_RECEIVED, or immediately for
    // a .torrent-file add) — chooses the file to stream (docs §5.2):
    // 1. an explicit setFilePriority() request made before metadata arrived
    // 2. otherwise, the largest video file in the torrent
    // Never assumes "largest file" alone is correct — a season-pack magnet's
    // largest file is not necessarily the requested episode.
    private fun applyFileSelection(handle: TorrentHandle) {
        val ti = handle.torrentFile() ?: return
        val numFiles = ti.numFiles()
        if (numFiles <= 0) return
        val torrentId = handle.infoHash().toHex().lowercase()

        val requested = requestedFileIndex[torrentId]
        val chosen = if (requested != null && requested in 0 until numFiles) {
            requested
        } else {
            val files = ti.files()
            (0 until numFiles).maxByOrNull { files.fileSize(it) } ?: 0
        }
        selectFile(handle, ti, chosen)
    }

    private fun applyReadAheadWindow(handle: TorrentHandle, ti: TorrentInfo, fileIndex: Int, byteOffset: Long) {
        val files = ti.files()
        val firstPiece = files.pieceIndexAtFile(fileIndex)
        val lastPiece = files.lastPieceIndexAtFile(fileIndex)
        val pieceLength = ti.pieceLength().coerceAtLeast(1)
        val startPiece = (firstPiece + (byteOffset / pieceLength)).toInt().coerceIn(firstPiece, lastPiece)

        handle.clearPieceDeadlines()

        // Critical for fast streaming start: prioritize container header pieces immediately
        // (piece 0 for EBML/MKV header, last piece for MP4 moov atom)
        handle.setPieceDeadline(firstPiece, 0)
        handle.setPieceDeadline(lastPiece, 0)

        var deadline = 0
        var piece = startPiece
        var count = 0
        while (piece <= lastPiece && count < READ_AHEAD_PIECES) {
            handle.setPieceDeadline(piece, deadline)
            piece += 1
            deadline += PIECE_DEADLINE_STEP_MS
            count += 1
        }
    }

    private fun stateToString(state: TorrentStatus.State?): String = when (state) {
        TorrentStatus.State.CHECKING_FILES -> "checkingFiles"
        TorrentStatus.State.DOWNLOADING_METADATA -> "downloadingMetadata"
        TorrentStatus.State.DOWNLOADING -> "downloading"
        TorrentStatus.State.FINISHED -> "finished"
        TorrentStatus.State.SEEDING -> "seeding"
        TorrentStatus.State.CHECKING_RESUME_DATA -> "checkingResumeData"
        else -> "unknown"
    }

    private class SessionAlertListener : AlertListener {
        override fun types(): IntArray? = null

        override fun alert(alert: Alert<*>) {
            when (alert.type()) {
                AlertType.ADD_TORRENT -> {
                    val addAlert = alert as AddTorrentAlert
                    val handle = addAlert.handle()
                    val hash = handle?.infoHash()?.toHex()?.lowercase() ?: "unknown"
                    if (handle != null && handle.isValid) {
                        handles[hash] = handle
                        handle.resume()
                        applyFileSelection(handle)
                        Log.i(TAG, "Torrent added: $hash")
                    } else {
                        Log.e(TAG, "AddTorrentAlert invalid or error: ${addAlert.message()}")
                    }
                }
                AlertType.METADATA_RECEIVED -> {
                    val metaAlert = alert as MetadataReceivedAlert
                    val handle = metaAlert.handle()
                    val hash = handle?.infoHash()?.toHex()?.lowercase() ?: "unknown"
                    Log.i(TAG, "Metadata received for torrent: $hash")
                    applyFileSelection(handle)
                }
                AlertType.METADATA_FAILED -> {
                    Log.w(TAG, "Metadata failed: ${alert.what()} - ${alert.message()}")
                }
                AlertType.TORRENT_ERROR -> {
                    Log.e(TAG, "Torrent error: ${alert.what()} - ${alert.message()}")
                }
                AlertType.LISTEN_SUCCEEDED -> {
                    Log.i(TAG, "Listen succeeded: ${alert.message()}")
                }
                AlertType.LISTEN_FAILED -> {
                    Log.w(TAG, "Listen failed: ${alert.message()}")
                }
                AlertType.TRACKER_REPLY -> {
                    Log.i(TAG, "Tracker reply: ${alert.message()}")
                }
                AlertType.TRACKER_ERROR -> {
                    Log.w(TAG, "Tracker error: ${alert.message()}")
                }
                AlertType.DHT_BOOTSTRAP -> {
                    Log.i(TAG, "DHT bootstrapped successfully")
                }
                else -> Unit
            }
        }
    }
}
