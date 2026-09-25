package com.shikara.player

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.shikara.torrent.TorrentSession

/**
 * Singleton bridging [PlayerModule] (JS-facing operations) to the single
 * active [ExoPlayer] instance owned by [PlayerViewManager]'s view.
 *
 * Only one Player screen is ever visible at a time (docs/03 §3.2), so a
 * single shared instance — rather than a per-view registry keyed by react
 * tag — is enough and keeps [PlayerModule] as simple as [TorrentModule].
 */
@UnstableApi
object PlayerBridge {

    private var player: ExoPlayer? = null
    private var torrentId: String? = null
    private var fileIndex: Int = -1

    fun attach(exoPlayer: ExoPlayer) {
        player = exoPlayer
    }

    fun detach() {
        player = null
        torrentId = null
        fileIndex = -1
    }

    // docs §5.3 — high-level operations only, no ExoPlayer internals leak
    // into TypeScript (enforced by PlayerModule only ever calling these).
    fun load(torrentId: String, fileIndex: Int, subtitleUrl: String?, subtitleLang: String?) {
        val p = player ?: return
        this.torrentId = torrentId
        this.fileIndex = fileIndex
        p.setMediaSource(buildMediaSource(torrentId, fileIndex, subtitleUrl, subtitleLang))
        p.prepare()
        p.playWhenReady = true
    }

    // For Stream.type === "direct" (docs §4.1.3) — a plain HTTP(S) link, no
    // torrent engine involved at all. ExoPlayer's default media source
    // factory resolves http/https on its own, so no custom DataSource is
    // needed here (unlike the torrent:// scheme in buildMediaSource).
    fun loadDirect(url: String, subtitleUrl: String?, subtitleLang: String?) {
        val p = player ?: return
        torrentId = null
        fileIndex = -1
        val itemBuilder = MediaItem.Builder().setUri(url)
        subtitleConfiguration(subtitleUrl, subtitleLang)?.let { itemBuilder.setSubtitleConfigurations(listOf(it)) }
        p.setMediaItem(itemBuilder.build())
        p.prepare()
        p.playWhenReady = true
    }

    private fun buildMediaSource(
        torrentId: String,
        fileIndex: Int,
        subtitleUrl: String?,
        subtitleLang: String?,
    ): ProgressiveMediaSource {
        val itemBuilder = MediaItem.Builder().setUri(Uri.parse("torrent://$torrentId/$fileIndex"))
        subtitleConfiguration(subtitleUrl, subtitleLang)?.let { itemBuilder.setSubtitleConfigurations(listOf(it)) }
        return ProgressiveMediaSource.Factory(TorrentDataSource.Factory()).createMediaSource(itemBuilder.build())
    }

    private fun subtitleConfiguration(subtitleUrl: String?, subtitleLang: String?): MediaItem.SubtitleConfiguration? {
        if (subtitleUrl == null) return null
        return MediaItem.SubtitleConfiguration.Builder(Uri.parse(subtitleUrl))
            .setMimeType(if (subtitleUrl.endsWith(".vtt")) MimeTypes.TEXT_VTT else MimeTypes.APPLICATION_SUBRIP)
            .apply { if (subtitleLang != null) setLanguage(subtitleLang) }
            .build()
    }

    fun play() {
        player?.play()
    }

    fun pause() {
        player?.pause()
    }

    fun stop() {
        player?.stop()
    }

    fun seek(positionMs: Long) {
        player?.seekTo(positionMs)
        notifySeekPosition(positionMs)
    }

    fun setAudioTrack(languageCode: String) {
        val p = player ?: return
        p.trackSelectionParameters = p.trackSelectionParameters.buildUpon().setPreferredAudioLanguage(languageCode).build()
    }

    // Media3 requires external subtitle tracks to be declared on the
    // MediaItem itself — switching means rebuilding it, unlike setAudioTrack.
    // Position/play-state are preserved across the rebuild (docs §3.2's
    // subtitle picker must not restart playback).
    fun setSubtitle(subtitleUrl: String?, subtitleLang: String?) {
        val p = player ?: return
        val id = torrentId ?: return
        val positionMs = p.currentPosition
        val wasPlaying = p.isPlaying
        p.setMediaSource(buildMediaSource(id, fileIndex, subtitleUrl, subtitleLang), positionMs)
        p.prepare()
        p.playWhenReady = wasPlaying
    }

    // No adaptive-bitrate renditions exist for a single torrent file — this
    // app's "Switch Source" flow (docs §3.2) is how a user changes quality,
    // not an in-player track switch. Kept as a documented no-op rather than
    // inventing ABR behavior that doesn't apply to this streaming model.
    fun setQuality() = Unit

    private fun notifySeekPosition(positionMs: Long) {
        val p = player ?: return
        val id = torrentId ?: return
        val duration = p.duration
        if (duration <= 0 || duration == C.TIME_UNSET) return
        val info = TorrentSession.getStreamFile(id, fileIndex) ?: return
        // Byte offset is a linear estimate from playback time, not an exact
        // demuxer-level mapping — accepted approximation (the same technique
        // used by other streaming-torrent players) since exact container
        // parsing for every format is out of scope here.
        val byteOffset = (positionMs.toDouble() / duration.toDouble() * info.fileSize).toLong()
        TorrentSession.updatePlaybackPosition(id, byteOffset)
    }

    fun getState(): WritableMap {
        val p = player
        val map = Arguments.createMap()
        val durationMs = p?.duration?.takeIf { it != C.TIME_UNSET } ?: 0L
        map.putDouble("currentTime", (p?.currentPosition ?: 0L) / 1000.0)
        map.putDouble("duration", durationMs / 1000.0)
        map.putDouble("bufferedPosition", (p?.bufferedPosition ?: 0L) / 1000.0)
        map.putBoolean("isPlaying", p?.isPlaying ?: false)
        map.putString("playbackState", playbackStateToString(p?.playbackState))
        map.putArray("audioLanguages", Arguments.fromList(audioLanguages(p)))
        map.putString("error", p?.playerError?.errorCodeName)
        return map
    }

    // Real embedded audio tracks from the file currently playing (docs §3.2's
    // audio picker) — distinct from Stream.audioTracks (title-parsed display
    // info shown on the Streams screen, docs §4.1.3), which isn't reliable
    // enough to drive actual track selection.
    private fun audioLanguages(p: ExoPlayer?): List<String> {
        if (p == null) return emptyList()
        val languages = LinkedHashSet<String>()
        for (group in p.currentTracks.groups) {
            if (group.type == C.TRACK_TYPE_AUDIO) {
                val trackGroup = group.mediaTrackGroup
                for (i in 0 until trackGroup.length) {
                    group.getTrackFormat(i).language?.let { languages.add(it) }
                }
            }
        }
        return languages.toList()
    }

    private fun playbackStateToString(state: Int?): String = when (state) {
        Player.STATE_IDLE -> "idle"
        Player.STATE_BUFFERING -> "buffering"
        Player.STATE_READY -> "ready"
        Player.STATE_ENDED -> "ended"
        else -> "idle"
    }
}
