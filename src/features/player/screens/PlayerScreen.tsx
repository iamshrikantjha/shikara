import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStreams } from '../../streams/hooks/useStreams';
import { useSubtitleAddons } from '../hooks/useSubtitles';
import { usePlayerSession } from '../hooks/usePlayerSession';
import { useAutoplayNextEpisode } from '../hooks/useAutoplayNextEpisode';
import { useMovie } from '../../movie-details/hooks/useMovie';
import { useSeries } from '../../series-details/hooks/useSeries';
import { TorrentPlayerView } from '../../../lib/native/TorrentPlayerView';
import { PlayerModule } from '../../../lib/native/PlayerModule';
import { mergeSubtitleTracks } from '../../../lib/addons/merge';
import { Button } from '../../../components/Button';
import { useSettings } from '../../../context/SettingsContext';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing, themeTokens } from '../../../styles/tokens';
import { useTheme } from '../../../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

// Episode mediaId is the composite `{seriesId}:{season}:{episode}` id, same
// convention as normalize.ts's groupSeasons (docs §4.1.2/EpisodeStreamsScreen).
function parseEpisodeMediaId(mediaId: string): { seriesId: string; season: number; episode: number } | null {
  const parts = mediaId.split(':');
  if (parts.length !== 3) return null;
  const season = Number(parts[1]);
  const episode = Number(parts[2]);
  if (!Number.isFinite(season) || !Number.isFinite(episode)) return null;
  return { seriesId: parts[0], season, episode };
}

function formatTime(rawSeconds: number): string {
  const seconds = Number.isFinite(rawSeconds) && rawSeconds > 0 ? rawSeconds : 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSpeed(bytesPerSec: number): string {
  const mb = bytesPerSec / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB/s` : `${Math.round(bytesPerSec / 1024)} KB/s`;
}

const CONTROLS_HIDE_MS = 3000;
const WATCHED_CONFIRM_THRESHOLD = 0.95;
const LANGUAGE_LABELS: Record<string, string> = { en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French' };

export function PlayerScreen({ route, navigation }: Props) {
  const { mediaId, type = 'movie', streamId } = route.params;
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];

  const episodeParts = type === 'series' ? parseEpisodeMediaId(mediaId) : null;
  const { data: movie } = useMovie(mediaId, { enabled: type === 'movie' });
  const { data: series } = useSeries(episodeParts?.seriesId ?? '', { enabled: episodeParts !== null });
  const title = type === 'movie' ? movie?.title : series?.title;
  const episodeLabel = episodeParts
    ? `S${String(episodeParts.season).padStart(2, '0')}E${String(episodeParts.episode).padStart(2, '0')}`
    : undefined;

  const { data: streamsResult } = useStreams(type, mediaId);
  const stream = streamsResult?.items.find(s => s.id === streamId);

  const [selectedSubtitle, setSelectedSubtitle] = useState<{ url: string; lang: string } | null>(null);
  const { data: subtitleAddonResult } = useSubtitleAddons(type, mediaId);
  const mergedSubtitles = mergeSubtitleTracks([stream?.subtitles ?? [], subtitleAddonResult?.items ?? []]);

  const { torrent } = useSettings();

  const { torrentStatus, playerState, error } = usePlayerSession(stream, {
    mediaId,
    libraryMediaId: episodeParts ? episodeParts.seriesId : mediaId,
    type,
    title: title ?? 'Untitled',
    episodeLabel,
    subtitleUrl: selectedSubtitle?.url,
    subtitleLang: selectedSubtitle?.lang,
    downloadMode: torrent.downloadMode,
  });

  useAutoplayNextEpisode({
    seriesId: episodeParts?.seriesId ?? '',
    season: episodeParts?.season ?? 0,
    episode: episodeParts?.episode ?? 0,
    series,
    playbackState: playerState?.playbackState,
    navigation,
  });

  const [controlsVisible, setControlsVisible] = useState(true);
  const [pickerOpen, setPickerOpen] = useState<'subtitle' | 'audio' | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showControls() {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
  }

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Back confirmation only if <95% watched (docs §3.2) — BackHandler covers
  // both the phone back gesture/button and a TV remote's back key.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const watched = playerState && playerState.duration > 0 ? playerState.currentTime / playerState.duration : 0;
      if (watched >= WATCHED_CONFIRM_THRESHOLD) {
        return false;
      }
      Alert.alert('Stop watching?', 'Your progress is saved, but playback will stop.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
      return true;
    });
    return () => sub.remove();
  }, [playerState, navigation]);

  function switchSource() {
    navigation.goBack();
  }

  const isBuffering = !error && (!playerState || playerState.playbackState === 'buffering' || playerState.playbackState === 'idle');

  if (error) {
    const message =
      error === 'metadata'
        ? 'This torrent could not be resolved.'
        : error === 'noPeers'
          ? 'No peers found for this source.'
          : error === 'declined'
            ? 'Streaming needs Wi-Fi or your permission to use mobile data.'
            : 'Playback failed for this source.';
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actionRow}>
            <Button label="Switch Source" onPress={switchSource} />
            <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={showControls}>
      <TorrentPlayerView style={StyleSheet.absoluteFill} />

      {isBuffering && (
        <View style={styles.center}>
          <Text style={styles.message}>Buffering…</Text>
          {torrentStatus && (
            <>
              <Text style={styles.subtext}>{formatSpeed(torrentStatus.downloadSpeed)}</Text>
              <Text style={styles.subtext}>{torrentStatus.peers} peers</Text>
              <Text style={styles.subtext}>{Math.round(torrentStatus.progress * 100)}% buffered</Text>
            </>
          )}
          <Button label="Switch Source" variant="secondary" onPress={switchSource} />
        </View>
      )}

      {controlsVisible && !isBuffering && (
        <>
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Text style={styles.text}>← Back</Text>
            </Pressable>
            <Text style={styles.text} numberOfLines={1}>
              {title ?? ''}
              {episodeLabel ? ` — ${episodeLabel}` : ''}
            </Text>
            <Pressable onPress={() => setPickerOpen('subtitle')} hitSlop={8}>
              <Text style={styles.text}>CC/Audio</Text>
            </Pressable>
            {stream?.quality && (
              <Text style={styles.text}>
                {stream.quality}
                {stream.codec ? ` · ${stream.codec}` : ''}
              </Text>
            )}
          </View>

          <View style={styles.centerControls}>
            <Pressable onPress={() => (playerState?.isPlaying ? PlayerModule.pause() : PlayerModule.play())} hitSlop={16}>
              <Text style={styles.playIcon}>{playerState?.isPlaying ? '⏸' : '▶'}</Text>
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            <View style={[styles.scrubTrack, { backgroundColor: t.skeleton }]}>
              <View
                style={[
                  styles.scrubBuffered,
                  {
                    width: `${playerState && playerState.duration > 0 ? Math.min(100, (playerState.bufferedPosition / playerState.duration) * 100) : 0}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.scrubPosition,
                  {
                    width: `${playerState && playerState.duration > 0 ? Math.min(100, (playerState.currentTime / playerState.duration) * 100) : 0}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.text}>{formatTime(playerState?.currentTime ?? 0)}</Text>
              <Pressable onPress={() => PlayerModule.seek(Math.max(0, (playerState?.currentTime ?? 0) - 10) * 1000)} hitSlop={8}>
                <Text style={styles.text}>−10s</Text>
              </Pressable>
              <Pressable onPress={() => PlayerModule.seek(((playerState?.currentTime ?? 0) + 10) * 1000)} hitSlop={8}>
                <Text style={styles.text}>+10s</Text>
              </Pressable>
              <Text style={styles.text}>{formatTime(playerState?.duration ?? 0)}</Text>
            </View>
          </View>
        </>
      )}

      <Modal visible={pickerOpen !== null} transparent animationType="slide" onRequestClose={() => setPickerOpen(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(null)}>
          <View style={[styles.sheet, { backgroundColor: t.overlay }]}>
            {pickerOpen === 'subtitle' && (
              <>
                <Text style={styles.sheetTitle}>Subtitles</Text>
                <Pressable
                  style={styles.sheetRow}
                  onPress={() => {
                    setSelectedSubtitle(null);
                    PlayerModule.setSubtitle(null, null);
                    setPickerOpen(null);
                  }}
                >
                  <Text style={styles.text}>{selectedSubtitle === null ? '✓ ' : ''}Off</Text>
                </Pressable>
                {mergedSubtitles.map(track => (
                  <Pressable
                    key={track.id}
                    style={styles.sheetRow}
                    onPress={() => {
                      setSelectedSubtitle({ url: track.url, lang: track.lang });
                      PlayerModule.setSubtitle(track.url, track.lang);
                      setPickerOpen(null);
                    }}
                  >
                    <Text style={styles.text}>
                      {selectedSubtitle?.url === track.url ? '✓ ' : ''}
                      {LANGUAGE_LABELS[track.lang] ?? track.lang} ({track.source})
                    </Text>
                  </Pressable>
                ))}
                <Pressable style={styles.sheetRow} onPress={() => setPickerOpen('audio')}>
                  <Text style={styles.text}>Audio tracks →</Text>
                </Pressable>
              </>
            )}
            {pickerOpen === 'audio' && (
              <>
                <Text style={styles.sheetTitle}>Audio</Text>
                {(playerState?.audioLanguages ?? []).map(lang => (
                  <Pressable key={lang} style={styles.sheetRow} onPress={() => PlayerModule.setAudioTrack(lang)}>
                    <Text style={styles.text}>{LANGUAGE_LABELS[lang] ?? lang}</Text>
                  </Pressable>
                ))}
                {(playerState?.audioLanguages ?? []).length === 0 && <Text style={styles.text}>No alternate audio tracks</Text>}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  subtext: {
    color: '#ccc',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  text: {
    color: '#fff',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
  },
  centerControls: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 48,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  scrubTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrubBuffered: {
    position: 'absolute',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  scrubPosition: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    padding: spacing.md,
  },
  sheetTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sheetRow: {
    paddingVertical: spacing.sm,
  },
});
