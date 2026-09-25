import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Tabs } from '../../../components/Tabs';
import { Button } from '../../../components/Button';
import { useTheme } from '../../../context/ThemeContext';
import { useLibrary } from '../../../context/LibraryContext';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/routes';
import { spacing, themeTokens } from '../../../styles/tokens';

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
        <Row label="Default subtitle language (available in a future phase)" />
        <Row label="Autoplay next episode (available in a future phase)" />
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
