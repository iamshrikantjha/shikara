package com.shikara.player

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSourceException
import androidx.media3.datasource.DataSpec
import com.shikara.torrent.TorrentSession
import java.io.File
import java.io.RandomAccessFile
import kotlin.math.min

/**
 * Reads a torrent's selected file directly off disk, blocking on individual
 * pieces that haven't downloaded yet instead of requiring the whole file
 * upfront — this is what docs/03-Phase3-Torrent-Streaming.md §5.3 means by
 * "played from local streaming buffer, not a raw download-then-play model".
 * Structurally mirrors Media3's own `FileDataSource`.
 *
 * Uri scheme: `torrent://<torrentId>/<fileIndex>` (see [PlayerBridge.load]).
 */
@UnstableApi
class TorrentDataSource : BaseDataSource(/* isNetwork= */ false) {

    class Factory : DataSource.Factory {
        override fun createDataSource(): DataSource = TorrentDataSource()
    }

    private var file: RandomAccessFile? = null
    private var dataUri: Uri? = null
    private var torrentId: String = ""
    private var fileIndex: Int = -1
    private var bytesRemaining: Long = 0
    private var filePosition: Long = 0
    private var opened = false

    override fun open(dataSpec: DataSpec): Long {
        val uri = dataSpec.uri
        dataUri = uri
        transferInitializing(dataSpec)

        val id = uri.host ?: throw DataSourceException(PlaybackException.ERROR_CODE_IO_UNSPECIFIED)
        val idx = uri.lastPathSegment?.toIntOrNull() ?: throw DataSourceException(PlaybackException.ERROR_CODE_IO_UNSPECIFIED)
        torrentId = id
        fileIndex = idx

        val info = TorrentSession.getStreamFile(id, idx)
            ?: throw DataSourceException(PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND)

        // Find the piece covering the requested read position.
        val startPiece = TorrentSession.pieceIndexForFileOffset(id, idx, dataSpec.position)
            ?: throw DataSourceException(PlaybackException.ERROR_CODE_IO_UNSPECIFIED)

        // Await the initial piece so libtorrent creates and writes the sparse file on disk,
        // avoiding FileNotFoundException on unallocated storage.
        if (!TorrentSession.awaitPiece(id, startPiece, PIECE_WAIT_TIMEOUT_MS)) {
            throw DataSourceException(PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT)
        }

        // Brief retry to ensure filesystem visibility once the piece has been written
        val diskFile = File(info.filePath)
        var attempts = 0
        var f: RandomAccessFile? = null
        while (attempts < 20 && f == null) {
            try {
                if (diskFile.exists()) {
                    f = RandomAccessFile(diskFile, "r")
                } else {
                    Thread.sleep(50)
                }
            } catch (_: Exception) {
                Thread.sleep(50)
            }
            attempts++
        }

        val finalFile = f ?: RandomAccessFile(info.filePath, "r")
        file = finalFile
        finalFile.seek(dataSpec.position)
        filePosition = dataSpec.position
        bytesRemaining = if (dataSpec.length != C.LENGTH_UNSET.toLong()) dataSpec.length else info.fileSize - dataSpec.position
        if (bytesRemaining < 0) {
            throw DataSourceException(PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE)
        }

        opened = true
        transferStarted(dataSpec)
        return bytesRemaining
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        if (length == 0) return 0
        if (bytesRemaining == 0L) return C.RESULT_END_OF_INPUT

        val pieceIndex = TorrentSession.pieceIndexForFileOffset(torrentId, fileIndex, filePosition)
            ?: throw DataSourceException(PlaybackException.ERROR_CODE_IO_UNSPECIFIED)
        // Blocks this thread (Media3's own loading thread) until the piece
        // covering the current read position has downloaded — this, plus the
        // read-ahead window in TorrentSession, is what makes the file
        // playable before it's 100% downloaded (docs §5.2).
        if (!TorrentSession.awaitPiece(torrentId, pieceIndex, PIECE_WAIT_TIMEOUT_MS)) {
            throw DataSourceException(PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT)
        }

        val toRead = min(bytesRemaining, length.toLong()).toInt()
        val bytesRead = file?.read(buffer, offset, toRead) ?: -1
        if (bytesRead > 0) {
            filePosition += bytesRead
            bytesRemaining -= bytesRead
            bytesTransferred(bytesRead)
        }
        return bytesRead
    }

    override fun getUri(): Uri? = dataUri

    override fun close() {
        dataUri = null
        try {
            file?.close()
        } finally {
            file = null
            if (opened) {
                opened = false
                transferEnded()
            }
        }
    }

    companion object {
        private const val PIECE_WAIT_TIMEOUT_MS = 30_000L
    }
}
