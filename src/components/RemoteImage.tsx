import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import FastImage, { type ImageStyle } from '@d11/react-native-fast-image';
import { useTheme } from '../context/ThemeContext';
import { themeTokens } from '../styles/tokens';

interface RemoteImageProps {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  priority?: 'low' | 'normal' | 'high';
  // Rendered over the skeleton placeholder while loading, missing, or failed
  // (e.g. a "Movie"/"Series" type badge) — never shown once the image loads.
  children?: React.ReactNode;
}

// Real poster/backdrop/thumbnail rendering. FastImage downsamples at decode
// time to this component's own size and disk/memory-caches by URL
// (PRD.md §14 — cached, appropriately-sized images; placeholder + failure
// fallback). Every image slot in the app goes through this one component.
export function RemoteImage({ uri, style, priority = 'normal', children }: RemoteImageProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showPlaceholder = !uri || failed || !loaded;

  return (
    <View style={[style, styles.container]}>
      {uri && !failed && (
        <FastImage
          style={StyleSheet.absoluteFill as StyleProp<ImageStyle>}
          source={{
            uri,
            priority: FastImage.priority[priority],
            cache: FastImage.cacheControl.immutable,
          }}
          resizeMode={FastImage.resizeMode.cover}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {showPlaceholder && (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: t.skeleton }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
