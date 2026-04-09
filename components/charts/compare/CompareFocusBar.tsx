import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';

type FocusKey = 'outcomes' | 'prestige' | 'assists' | 'objectives' | 'efficiency' | 'positioning';

type Props = { activeKey: FocusKey; onSelect: (key: FocusKey) => void };

const ITEMS: { key: FocusKey; label: string; sub: string }[] = [
  { key: 'outcomes', label: 'Overview', sub: 'Best overall read' },
  { key: 'prestige', label: 'Prestige', sub: 'Economy and pace' },
  { key: 'assists', label: 'Assists', sub: 'Support and synergy' },
  { key: 'objectives', label: 'Objectives', sub: 'Mission pressure' },
  { key: 'efficiency', label: 'Efficiency', sub: 'Conversion quality' },
  { key: 'positioning', label: 'Positioning', sub: 'Seat order signal' },
];

export default function CompareFocusBar({ activeKey, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {ITEMS.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable key={item.key} onPress={() => onSelect(item.key)} style={[styles.card, active && styles.cardActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            <Text style={[styles.sub, active && styles.subActive]}>{item.sub}</Text>
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
    backgroundColor: 'rgba(86, 120, 255, 0.22)',
    borderColor: 'rgba(125, 235, 255, 0.58)',
    shadowColor: '#7DEBFF',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
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
    color: '#D7F7FF',
  },
});


