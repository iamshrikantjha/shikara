import type { Media, SortOption } from './types';

// Sort/genre-filter are client-side UI concerns applied on top of already-fetched,
// already-merged addon results — not addon query params (see useDiscover).
export function sortMedia(items: Media[], sort: SortOption | undefined): Media[] {
  const copy = [...items];
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'az':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'popularity':
    default:
      return copy;
  }
}

export function filterByGenres(items: Media[], genres: string[]): Media[] {
  if (genres.length === 0) return items;
  return items.filter(item => item.genres.some(g => genres.includes(g)));
}
