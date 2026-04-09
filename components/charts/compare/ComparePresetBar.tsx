import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';

type PresetKey = 'headline' | 'teamplay' | 'objectives' | 'efficiency' | 'positioning';

type Props = { activePreset: PresetKey; onSelect: (preset: PresetKey) => void };

const PRESETS: { key: PresetKey; label: string; sub: string }[] = [
  { key: 'headline', label: 'Headline', sub: 'Fast overview' },
  { key: 'teamplay', label: 'Team Play', sub: 'Support edges' },
  { key: 'objectives', label: 'Objectives', sub: 'Scenario control' },
  { key: 'efficiency', label: 'Efficiency', sub: 'Conversion strength' },
  { key: 'positioning', label: 'Positioning', sub: 'Turn-order impact' },
];

export default function ComparePresetBar({ activePreset, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {PRESETS.map((preset) => {
        const active = preset.key === activePreset;
        return (
          <Pressable key={preset.key} onPress={() => onSelect(preset.key)} style={[styles.card, active && styles.cardActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{preset.label}</Text>
            <Text style={[styles.sub, active && styles.subActive]}>{preset.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  card: {
    width: '48.5%',
    minHeight: 48,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    justifyContent: 'center',
  },
  cardActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderColor: 'rgba(196, 181, 253, 0.58)',
  },
  label: {
    color: '#E5EEF9',
    fontSize: 12,
    fontWeight: '700',
  },
  labelActive: {
    color: '#FFFFFF',
  },
  sub: {
    color: '#8FA6C4',
    fontSize: 10,
    marginTop: 2,
  },
  subActive: {
    color: '#E9D5FF',
  },
});


