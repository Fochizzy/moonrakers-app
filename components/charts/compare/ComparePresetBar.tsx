import React from 'react';
import { Pressable, View } from 'react-native';
import Text from '@/components/ui/Text';
import { styles } from '@/utils/compareStyles';

type PresetKey = 'headline' | 'teamplay' | 'objectives' | 'efficiency' | 'positioning';

type Props = { activePreset: PresetKey; onSelect: (preset: PresetKey) => void };

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'headline', label: 'Headline' },
  { key: 'teamplay', label: 'Team Play' },
  { key: 'objectives', label: 'Objectives' },
  { key: 'efficiency', label: 'Efficiency' },
  { key: 'positioning', label: 'Positioning' },
];

export default function ComparePresetBar({ activePreset, onSelect }: Props) {
  return (
    <View style={styles.presetBar}>
      {PRESETS.map((preset) => {
        const active = preset.key === activePreset;
        return (
          <Pressable key={preset.key} style={[styles.presetPill, active ? styles.presetPillActive : null]} onPress={() => onSelect(preset.key)}>
            <Text style={[styles.presetPillText, active ? styles.presetPillTextActive : null]}>{preset.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
