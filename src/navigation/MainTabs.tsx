import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './routes';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { DiscoverScreen } from '../features/discover/screens/DiscoverScreen';
import { SearchScreen } from '../features/search/screens/SearchScreen';
import { LibraryScreen } from '../features/library/screens/LibraryScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';

// Phone/tablet chrome for Phase 1: a plain bottom tab bar. Web/TV rail chrome
// (01-Phase1-UI-Navigation.md §2.3) is a follow-up — this is the single place
// that will branch on Platform.isTV / web breakpoint once that lands.
const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="DiscoverTab" component={DiscoverScreen} options={{ title: 'Discover' }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="LibraryTab" component={LibraryScreen} options={{ title: 'Library' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
