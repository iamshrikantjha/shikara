import { useEffect, useRef } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAddons } from '../../../context/AddonsContext';
import { useLibrary } from '../../../context/LibraryContext';
import { useSettings } from '../../../context/SettingsContext';
import { fetchMergedStreams } from '../../../lib/addons/queries';
import type { RootStackParamList } from '../../../navigation/routes';
import type { PlaybackState } from '../../../lib/native/PlayerModule';
import type { Episode, Series } from '../../../lib/types';

interface Options {
  seriesId: string;
  season: number;
  episode: number;
  series: Series | null | undefined;
  playbackState: PlaybackState | undefined;
  navigation: NativeStackScreenProps<RootStackParamList, 'Player'>['navigation'];
}

function findNextEpisode(series: Series, season: number, episode: number): Episode | null {
  const currentSeason = series.seasons.find(s => s.seasonNumber === season);
  const next = currentSeason?.episodes.find(e => e.episodeNumber === episode + 1);
  if (next) return next;
  const nextSeason = series.seasons.find(s => s.seasonNumber === season + 1);
  return nextSeason?.episodes[0] ?? null;
}

// On playback end, reuses lastStream's addon+quality for the next episode;
// if that addon has no result for it (or the lookup fails), falls back to
// the normal Streams screen for a manual pick — never silently substitutes a
// different addon (docs/03-Phase3-Torrent-Streaming.md §3.3).
export function useAutoplayNextEpisode({ seriesId, season, episode, series, playbackState, navigation }: Options) {
  const { playback } = useSettings();
  const { items } = useLibrary();
  const { addons } = useAddons();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (playbackState !== 'ended' || triggeredRef.current || !playback.autoplayNextEpisode || !series || !seriesId) {
      return;
    }
    const next = findNextEpisode(series, season, episode);
    if (!next) return;
    triggeredRef.current = true;

    const nextSeason = next.seasonNumber;
    const nextEpisodeNumber = next.episodeNumber;
    const nextMediaId = `${seriesId}:${nextSeason}:${nextEpisodeNumber}`;
    const lastStream = items.find(i => i.mediaId === seriesId)?.lastStream;

    async function goToNextEpisode() {
      if (lastStream) {
        try {
          const result = await fetchMergedStreams(addons, 'series', nextMediaId);
          const match = result.items.find(s => s.source === lastStream!.source && s.quality === lastStream!.quality);
          if (match) {
            navigation.replace('Player', { mediaId: nextMediaId, type: 'series', streamId: match.id });
            return;
          }
        } catch {
          // fall through to manual pick
        }
      }
      navigation.replace('EpisodeStreams', { id: seriesId, season: nextSeason, episode: nextEpisodeNumber });
    }

    goToNextEpisode();
  }, [playbackState, playback.autoplayNextEpisode, series, season, episode, seriesId, items, addons, navigation]);
}
