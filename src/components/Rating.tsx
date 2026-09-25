import React from 'react';
import { Text } from 'react-native';

export function Rating({ value }: { value?: number }) {
  if (value === undefined) {
    return null;
  }
  return <Text>{`★ ${value.toFixed(1)}`}</Text>;
}
