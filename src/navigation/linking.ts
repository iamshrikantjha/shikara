import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './routes';

// Deep link scheme + web URL config — matches 01-Phase1-UI-Navigation.md §2.2
// exactly. Web uses plain paths (no hash routing).
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['shikara://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          HomeTab: '',
          DiscoverTab: 'discover',
          SearchTab: 'search',
          LibraryTab: 'library',
          SettingsTab: 'settings',
        },
      },
      MovieDetails: 'movie/:id',
      SeriesDetails: 'series/:id',
      Season: 'series/:id/season/:season',
      EpisodeDetails: 'series/:id/season/:season/episode/:episode',
      MovieStreams: 'movie/:id/streams',
      EpisodeStreams: 'series/:id/season/:season/episode/:episode/streams',
      Player: 'player/:mediaId',
      History: 'history',
      SettingsAddons: 'settings/addons',
      SettingsAbout: 'settings/about',
      NotFound: '*',
    },
  },
};
