// Single source of truth for route names + params — the hand-maintained
// equivalent of a generated route tree (01-Phase1-UI-Navigation.md §11.2).
// Keep this in sync with that doc's §2.2 route table.

export type MainTabParamList = {
  HomeTab: undefined;
  DiscoverTab: { type?: 'movie' | 'series' } | undefined;
  SearchTab: { q?: string } | undefined;
  LibraryTab: { tab?: 'movies' | 'series' | 'watchlist' } | undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  MovieDetails: { id: string };
  SeriesDetails: { id: string; season?: number };
  Season: { id: string; season: number };
  EpisodeDetails: { id: string; season: number; episode: number };
  MovieStreams: { id: string };
  EpisodeStreams: { id: string; season: number; episode: number };
  Player: { mediaId: string; type?: 'movie' | 'series'; streamId?: string };
  History: undefined;
  SettingsAddons: undefined;
  SettingsAbout: undefined;
  NotFound: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
