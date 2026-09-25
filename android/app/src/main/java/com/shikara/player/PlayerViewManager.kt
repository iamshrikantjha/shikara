package com.shikara.player

import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

/**
 * Renders the video surface only — docs/03-Phase3-Torrent-Streaming.md §3.2's
 * controls (play/pause, scrub bar, buffering overlay, subtitle/audio picker)
 * are built in RN on top of this, not ExoPlayer's own control overlay
 * (`useController = false`). All playback operations go through
 * [PlayerModule]/[PlayerBridge], not view props or commands — this view
 * manager's only job is to own the [ExoPlayer] instance and register it with
 * [PlayerBridge] while it's on screen.
 */
@UnstableApi
class PlayerViewManager : SimpleViewManager<PlayerView>() {

    override fun getName(): String = "TorrentPlayerView"

    override fun createViewInstance(reactContext: ThemedReactContext): PlayerView {
        val exoPlayer = ExoPlayer.Builder(reactContext).build()
        val view = PlayerView(reactContext)
        view.player = exoPlayer
        view.useController = false
        PlayerBridge.attach(exoPlayer)
        return view
    }

    override fun onDropViewInstance(view: PlayerView) {
        super.onDropViewInstance(view)
        PlayerBridge.detach()
        view.player?.release()
        view.player = null
    }
}
