import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { useAddons } from '../../../context/AddonsContext';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, themeTokens } from '../../../styles/tokens';

export function AddonManagerScreen() {
  const { addons, installAddon, installing, toggleAddon, removeAddon, moveAddon } = useAddons();
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  const [url, setUrl] = useState('');
  const [installError, setInstallError] = useState<string | undefined>();

  async function handleInstall() {
    const result = await installAddon(url);
    if (!result.ok) {
      setInstallError(result.error);
      return;
    }
    setInstallError(undefined);
    setUrl('');
  }

  return (
    <View style={styles.container}>
      {addons.length === 0 ? (
        <EmptyState message="No addons installed" />
      ) : (
        <FlatList
          data={addons}
          keyExtractor={item => item.manifest.id}
          renderItem={({ item, index }) => (
            <View style={[styles.row, { borderColor: t.border }]}>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.manifest.name} <Text style={styles.version}>v{item.manifest.version}</Text>
                </Text>
                <View style={styles.badgeRow}>
                  {item.manifest.resources.length === 0 ? (
                    <Text style={styles.dimmed}>No declared capabilities</Text>
                  ) : (
                    item.manifest.resources.map(cap => (
                      <View key={cap} style={styles.badgeSpacing}>
                        <Badge label={cap} />
                      </View>
                    ))
                  )}
                </View>
              </View>
              <View style={styles.controls}>
                <Switch value={item.enabled} onValueChange={() => toggleAddon(item.manifest.id)} />
                <Pressable onPress={() => moveAddon(item.manifest.id, 'up')} disabled={index === 0} hitSlop={8}>
                  <Text style={{ opacity: index === 0 ? 0.3 : 1 }}>▲</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveAddon(item.manifest.id, 'down')}
                  disabled={index === addons.length - 1}
                  hitSlop={8}
                >
                  <Text style={{ opacity: index === addons.length - 1 ? 0.3 : 1 }}>▼</Text>
                </Pressable>
                <Pressable onPress={() => removeAddon(item.manifest.id)} hitSlop={8}>
                  <Text>✕</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <View style={[styles.installRow, { borderColor: t.border }]}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="Addon manifest URL"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button label={installing ? 'Installing…' : 'Install'} onPress={handleInstall} disabled={installing} />
      </View>
      {installError && <Text style={styles.error}>{installError}</Text>}
      <Text style={[styles.dimmed, styles.footnote]}>
        Installing fetches and validates the addon's manifest.json directly from the URL — no
        marketplace, no backend in between. Capability badges above come straight from what each
        manifest declares.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  version: {
    fontWeight: '400',
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  badgeSpacing: {
    marginRight: spacing.xs,
  },
  dimmed: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  installRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  error: {
    marginTop: spacing.xs,
  },
  footnote: {
    marginTop: spacing.md,
  },
});
