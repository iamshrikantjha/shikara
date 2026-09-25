import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { spacing } from '../styles/tokens';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && <Button label="Retry" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
