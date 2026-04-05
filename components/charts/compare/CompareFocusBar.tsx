import React from 'react';
import { Pressable, View } from 'react-native';
import Text from '@/components/ui/Text';
import { styles } from '@/utils/compareStyles';

type FocusKey = 'outcomes' | 'prestige' | 'assists' | 'objectives' | 'efficiency' | 'positioning';

type Props = { activeKey: FocusKey; onSelect: (key: FocusKey) => void };

const ITEMS: { key: FocusKey; label: string }[] = [
  { key: 'outcomes', label: 'Overview' },
  { key: 'prestige', label: 'Prestige' },
  { key: 'assists', label: 'Assists' },
  { key: 'objectives', label: 'Objectives' },
  { key: 'efficiency', label: 'Efficiency' },
  { key: 'positioning', label: 'Positioning' },
];

export default function CompareFocusBar({ activeKey, onSelect }: Props) {
  return (
    <View style={styles.focusBar}>
      {ITEMS.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable key={item.key} style={[styles.focusPill, active ? styles.focusPillActive : null]} onPress={() => onSelect(item.key)}>
            <Text style={[styles.focusPillText, active ? styles.focusPillTextActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
