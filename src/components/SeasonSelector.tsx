import React from 'react';
import { ScrollView } from 'react-native';
import { Chip } from './Chip';
import { spacing } from '../styles/tokens';

interface SeasonSelectorProps {
  seasonNumbers: number[];
  selected: number;
  onSelect: (season: number) => void;
}

export function SeasonSelector({ seasonNumbers, selected, onSelect }: SeasonSelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing.md }}>
      {seasonNumbers.map(season => (
        <Chip
          key={season}
          label={`Season ${season}`}
          selected={season === selected}
          onPress={() => onSelect(season)}
        />
      ))}
    </ScrollView>
  );
}
