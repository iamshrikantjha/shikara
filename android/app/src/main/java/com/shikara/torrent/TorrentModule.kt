package com.shikara.torrent

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * JS-facing native module implementing docs/03-Phase3-Torrent-Streaming.md
 * §5.1's API. All BitTorrent logic lives in [TorrentSession] — this class is
 * only the React Native bridge boundary (docs §6's native module boundary:
 * nothing above this layer knows libtorrent4j exists).
 *
 * Deliberately a "classic" [ReactContextBaseJavaModule] registered through a
 * plain `ReactPackage` ([TorrentPackage]) rather than a codegen'd TurboModule
 * spec: with New Architecture enabled (`newArchEnabled=true`), React Native's
 * Turbo Module interop layer resolves `TurboModuleRegistry.get('TorrentModule')`
 * to a legacy module registered this way automatically, so this works without
 * a generated spec file. Upgrade to a real TurboModule spec later only if
 * strict New-Architecture codegen typing is needed.
 */
class TorrentModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TorrentModule"

    // Streaming buffer cache lives under the app's own cache dir — this is
    // also what "Clear streaming cache" (docs §3.3) deletes via clearCache().
    private val saveDir: File by lazy {
        File(reactApplicationContext.cacheDir, "torrents").apply { mkdirs() }
    }

    @ReactMethod
    fun addMagnet(uri: String, promise: Promise) {
        try {
            promise.resolve(TorrentSession.addMagnet(uri, saveDir))
        } catch (e: Exception) {
            promise.reject("ADD_MAGNET_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun addTorrent(torrentFilePath: String, promise: Promise) {
        try {
            promise.resolve(TorrentSession.addTorrent(torrentFilePath, saveDir))
        } catch (e: Exception) {
            promise.reject("ADD_TORRENT_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun start(torrentId: String) {
        TorrentSession.start(torrentId)
    }

    @ReactMethod
    fun pause(torrentId: String) {
        TorrentSession.pause(torrentId)
    }

    @ReactMethod
    fun resume(torrentId: String) {
        TorrentSession.resume(torrentId)
    }

    @ReactMethod
    fun stop(torrentId: String) {
        TorrentSession.stop(torrentId)
    }

    @ReactMethod
    fun remove(torrentId: String) {
        TorrentSession.remove(torrentId)
    }

    @ReactMethod
    fun getStatus(torrentId: String, promise: Promise) {
        promise.resolve(TorrentSession.getStatus(torrentId))
    }

    @ReactMethod
    fun getFiles(torrentId: String, promise: Promise) {
        promise.resolve(TorrentSession.getFiles(torrentId))
    }

    @ReactMethod
    fun getPeers(torrentId: String, promise: Promise) {
        promise.resolve(TorrentSession.getPeers(torrentId))
    }

    @ReactMethod
    fun getProgress(torrentId: String, promise: Promise) {
        promise.resolve(TorrentSession.getProgress(torrentId))
    }

    @ReactMethod
    fun setFilePriority(torrentId: String, fileIndex: Int, priority: Int) {
        TorrentSession.setFilePriority(torrentId, fileIndex, priority)
    }

    // Beyond §5.1's literal list — lets JS learn which file libtorrent
    // actually selected (an explicit setFilePriority() request, once
    // metadata is ready, or the largest-file fallback) so it can hand that
    // index to PlayerModule.load() without duplicating any file-selection
    // logic in JavaScript (docs §5.2, §6).
    @ReactMethod
    fun getSelectedFileIndex(torrentId: String, promise: Promise) {
        promise.resolve(TorrentSession.getSelectedFileIndex(torrentId))
    }

    // Beyond §5.1's literal list — needed for §5.2's "seeking into an
    // unbuffered region must trigger re-prioritization" behavior; the Player
    // (item 5) calls this on seek.
    @ReactMethod
    fun updatePlaybackPosition(torrentId: String, fileByteOffset: Double) {
        TorrentSession.updatePlaybackPosition(torrentId, fileByteOffset.toLong())
    }

    // Beyond §5.1's literal list — backs the "Clear streaming cache" button
    // (docs §3.3).
    @ReactMethod
    fun clearCache(promise: Promise) {
        try {
            TorrentSession.clearCache(saveDir)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CLEAR_CACHE_FAILED", e.message, e)
        }
    }
}
