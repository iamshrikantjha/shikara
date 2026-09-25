import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Tabs } from '../../../components/Tabs';
import { Stepper } from '../../../components/Stepper';
import { Button } from '../../../components/Button';
import { useTheme } from '../../../context/ThemeContext';
import { useLibrary } from '../../../context/LibraryContext';
import {
  useSettings,
  type AudioLanguage,
  type DownloadMode,
  type PreferredQuality,
  type SubtitleLanguage,
} from '../../../context/SettingsContext';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/routes';
import { spacing, themeTokens } from '../../../styles/tokens';

// Label <-> stored-value maps for the Tabs-based pickers below — Tabs works on
// display labels, settings store the underlying codes (docs/03 §3.3).
const SUBTITLE_LANGUAGES: [string, SubtitleLanguage][] = [
  ['Off', 'off'],
  ['English', 'en'],
  ['Hindi', 'hi'],
  ['Spanish', 'es'],
  ['French', 'fr'],
];
const AUDIO_LANGUAGES: [string, AudioLanguage][] = [
  ['Auto', 'auto'],
  ['English', 'en'],
  ['Hindi', 'hi'],
  ['Spanish', 'es'],
  ['French', 'fr'],
];
const PREFERRED_QUALITIES: [string, PreferredQuality][] = [
  ['Auto', 'Auto'],
  ['1080p', '1080p'],
  ['720p', '720p'],
  ['480p', '480p'],
];
const DOWNLOAD_MODES: [string, DownloadMode][] = [
  ['Wi-Fi only', 'wifiOnly'],
  ['Wi-Fi + Mobile Data', 'wifiAndMobile'],
];

function labelFor<T extends string>(pairs: [string, T][], value: T): string {
  return pairs.find(([, v]) => v === value)?.[0] ?? pairs[0][0];
}

function valueFor<T extends string>(pairs: [string, T][], label: string): T {
  return pairs.find(([l]) => l === label)?.[1] ?? pairs[0][1];
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, onPress, children }: { label: string; onPress?: () => void; children?: React.ReactNode }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.row}>
      <Text>{label}</Text>
      {children}
    </Wrapper>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { preference, setPreference } = useTheme();
  const { resetLocalData } = useLibrary();
  const {
    playback,
    torrent,
    setSubtitleLanguage,
    setAudioLanguage,
    setAutoplayNextEpisode,
    setPreferredQuality,
    setMaxPeers,
    setDownloadMode,
    setMaxCacheSizeGB,
    clearingCache,
    clearStreamingCache,
  } = useSettings();
  const t = themeTokens.light;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="General">
        <Row label="Theme">
          <Tabs
            options={['System', 'Light', 'Dark']}
            selected={preference.charAt(0).toUpperCase() + preference.slice(1)}
            onSelect={value => setPreference(value.toLowerCase() as typeof preference)}
          />
        </Row>
      </Section>

      <Section title="Playback">
        <Row label="Default subtitle language">
          <Tabs
            options={SUBTITLE_LANGUAGES.map(([label]) => label)}
            selected={labelFor(SUBTITLE_LANGUAGES, playback.subtitleLanguage)}
            onSelect={label => setSubtitleLanguage(valueFor(SUBTITLE_LANGUAGES, label))}
          />
        </Row>
        <Row label="Default audio language">
          <Tabs
            options={AUDIO_LANGUAGES.map(([label]) => label)}
            selected={labelFor(AUDIO_LANGUAGES, playback.audioLanguage)}
            onSelect={label => setAudioLanguage(valueFor(AUDIO_LANGUAGES, label))}
          />
        </Row>
        <Row label="Autoplay next episode">
          <Switch value={playback.autoplayNextEpisode} onValueChange={setAutoplayNextEpisode} />
        </Row>
        <Row label="Preferred quality">
          <Tabs
            options={PREFERRED_QUALITIES.map(([label]) => label)}
            selected={labelFor(PREFERRED_QUALITIES, playback.preferredQuality)}
            onSelect={label => setPreferredQuality(valueFor(PREFERRED_QUALITIES, label))}
          />
        </Row>
      </Section>

      <Section title="Torrent">
        <Row label="Max connected peers">
          <Stepper value={torrent.maxPeers} onChange={setMaxPeers} min={10} max={200} step={10} />
        </Row>
        <Row label="Download on">
          <Tabs
            options={DOWNLOAD_MODES.map(([label]) => label)}
            selected={labelFor(DOWNLOAD_MODES, torrent.downloadMode)}
            onSelect={label => setDownloadMode(valueFor(DOWNLOAD_MODES, label))}
          />
        </Row>
        <Row label="Max streaming cache size">
          <Stepper value={torrent.maxCacheSizeGB} onChange={setMaxCacheSizeGB} min={1} max={20} unit=" GB" />
        </Row>
        <Row label="Storage location">
          <Text style={{ color: t.muted }}>Default app cache directory</Text>
        </Row>
        <Button
          label={clearingCache ? 'Clearing…' : 'Clear streaming cache'}
          variant="secondary"
          onPress={() => clearStreamingCache().then(() => Alert.alert('Streaming cache cleared'))}
        />
      </Section>

      <Row label="Addons" onPress={() => navigation.navigate('SettingsAddons')}>
        <Text>›</Text>
      </Row>

      <Section title="Developer">
        <Button label="Reset local data (Library/History)" onPress={resetLocalData} />
      </Section>

      <Row label="About" onPress={() => navigation.navigate('SettingsAbout')}>
        <Text>›</Text>
      </Row>

      <Text style={[styles.footnote, { color: t.muted }]}>
        This app has no account or sign-in — everything lives on this device only.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  footnote: {
    marginTop: spacing.lg,
    fontSize: 12,
  },
});
