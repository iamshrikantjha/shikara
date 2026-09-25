import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import { linking } from './linking';
import { MainTabs } from './MainTabs';
import { MovieDetailsScreen } from '../features/movie-details/screens/MovieDetailsScreen';
import { SeriesDetailsScreen } from '../features/series-details/screens/SeriesDetailsScreen';
import { SeasonScreen } from '../features/season/screens/SeasonScreen';
import { EpisodeDetailsScreen } from '../features/episode-details/screens/EpisodeDetailsScreen';
import { PlayerScreen } from '../features/player/screens/PlayerScreen';
import { HistoryScreen } from '../features/history/screens/HistoryScreen';
import { AddonManagerScreen } from '../features/addons/screens/AddonManagerScreen';
import { SettingsAboutScreen } from '../features/settings/screens/SettingsAboutScreen';
import { NotFoundScreen } from '../features/not-found/screens/NotFoundScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: '' }} />
        <Stack.Screen name="SeriesDetails" component={SeriesDetailsScreen} options={{ title: '' }} />
        <Stack.Screen name="Season" component={SeasonScreen} options={{ title: 'Season' }} />
        <Stack.Screen
          name="EpisodeDetails"
          component={EpisodeDetailsScreen}
          options={{ presentation: 'modal', title: '' }}
        />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="SettingsAddons" component={AddonManagerScreen} options={{ title: 'Addons' }} />
        <Stack.Screen name="SettingsAbout" component={SettingsAboutScreen} options={{ title: 'About' }} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Not Found' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
