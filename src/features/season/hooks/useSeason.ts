import { useMemo } from 'react';
import { useSeries } from '../../series-details/hooks/useSeries';

// Season data is derived from the series' meta response, not a separate
// endpoint — matches how Cinemeta returns the full episode list inside a
// series' meta (02-Phase2-API-Integration.md §6).
export function useSeason(seriesId: string, seasonNumber: number) {
  const seriesQuery = useSeries(seriesId);
  const season = useMemo(
    () => seriesQuery.data?.seasons.find(s => s.seasonNumber === seasonNumber),
    [seriesQuery.data, seasonNumber],
  );
  return { ...seriesQuery, series: seriesQuery.data, season };
}
