import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../../components/Button';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing } from '../../../styles/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'NotFound'>;

export function NotFoundScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Button label="Go Home" onPress={() => navigation.navigate('MainTabs')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    marginBottom: spacing.md,
  },
});
