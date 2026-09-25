package com.shikara.player

import androidx.media3.common.util.UnstableApi
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * JS-facing native module implementing docs/03-Phase3-Torrent-Streaming.md
 * §5.3's high-level player operations. Same "classic" (non-codegen)
 * registration approach as [com.shikara.torrent.TorrentModule] — see that
 * class's doc comment for why.
 *
 * All state lives in [PlayerBridge]; this class is only the bridge boundary.
 * Playback position/duration/buffered-range/state are polled via [getState]
 * rather than pushed as events, matching [com.shikara.torrent.TorrentModule]'s
 * getStatus() polling pattern and avoiding any Old/New-Architecture event
 * dispatch divergence.
 */
@UnstableApi
class PlayerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PlayerModule"

    @ReactMethod
    fun load(torrentId: String, fileIndex: Int, subtitleUrl: String?, subtitleLang: String?) {
        PlayerBridge.load(torrentId, fileIndex, subtitleUrl, subtitleLang)
    }

    // Stream.type === "direct" (docs §4.1.3) — no torrent engine involved.
    @ReactMethod
    fun loadDirect(url: String, subtitleUrl: String?, subtitleLang: String?) {
        PlayerBridge.loadDirect(url, subtitleUrl, subtitleLang)
    }

    @ReactMethod
    fun play() {
        PlayerBridge.play()
    }

    @ReactMethod
    fun pause() {
        PlayerBridge.pause()
    }

    @ReactMethod
    fun stop() {
        PlayerBridge.stop()
    }

    @ReactMethod
    fun seek(positionMs: Double) {
        PlayerBridge.seek(positionMs.toLong())
    }

    @ReactMethod
    fun setQuality() {
        PlayerBridge.setQuality()
    }

    @ReactMethod
    fun setAudioTrack(languageCode: String) {
        PlayerBridge.setAudioTrack(languageCode)
    }

    @ReactMethod
    fun setSubtitle(subtitleUrl: String?, subtitleLang: String?) {
        PlayerBridge.setSubtitle(subtitleUrl, subtitleLang)
    }

    @ReactMethod
    fun getState(promise: Promise) {
        promise.resolve(PlayerBridge.getState())
    }
}
