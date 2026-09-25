package com.shikara.player

import androidx.media3.common.util.UnstableApi
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

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
 *
 * Every call below is marshaled onto the UI thread via [UiThreadUtil]: RN's
 * `@ReactMethod`s run on a background bridge thread, but ExoPlayer requires
 * every interaction to happen on the same thread it was created on —
 * [PlayerViewManager.createViewInstance] creates it on the UI thread (React
 * Native guarantees view-manager lifecycle methods run there), so all access
 * here must hop back to that same thread or ExoPlayer throws
 * "Player is accessed on the wrong thread" (verified against a real crash on
 * a physical/emulated device — this isn't a theoretical concern).
 */
@UnstableApi
class PlayerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PlayerModule"

    @ReactMethod
    fun load(torrentId: String, fileIndex: Int, subtitleUrl: String?, subtitleLang: String?) {
        UiThreadUtil.runOnUiThread { PlayerBridge.load(torrentId, fileIndex, subtitleUrl, subtitleLang) }
    }

    // Stream.type === "direct" (docs §4.1.3) — no torrent engine involved.
    @ReactMethod
    fun loadDirect(url: String, subtitleUrl: String?, subtitleLang: String?) {
        UiThreadUtil.runOnUiThread { PlayerBridge.loadDirect(url, subtitleUrl, subtitleLang) }
    }

    @ReactMethod
    fun play() {
        UiThreadUtil.runOnUiThread { PlayerBridge.play() }
    }

    @ReactMethod
    fun pause() {
        UiThreadUtil.runOnUiThread { PlayerBridge.pause() }
    }

    @ReactMethod
    fun stop() {
        UiThreadUtil.runOnUiThread { PlayerBridge.stop() }
    }

    @ReactMethod
    fun seek(positionMs: Double) {
        UiThreadUtil.runOnUiThread { PlayerBridge.seek(positionMs.toLong()) }
    }

    @ReactMethod
    fun setQuality() {
        UiThreadUtil.runOnUiThread { PlayerBridge.setQuality() }
    }

    @ReactMethod
    fun setAudioTrack(languageCode: String) {
        UiThreadUtil.runOnUiThread { PlayerBridge.setAudioTrack(languageCode) }
    }

    @ReactMethod
    fun setSubtitle(subtitleUrl: String?, subtitleLang: String?) {
        UiThreadUtil.runOnUiThread { PlayerBridge.setSubtitle(subtitleUrl, subtitleLang) }
    }

    @ReactMethod
    fun getState(promise: Promise) {
        UiThreadUtil.runOnUiThread { promise.resolve(PlayerBridge.getState()) }
    }
}
