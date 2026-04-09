import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';

type Props = {
  title?: string;
  body?: string;
};

export default function RadarChartInspector({
  title = 'Radar Focus',
  body = 'Tap a radar point to inspect a trait.',
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: 'rgba(15,23,42,0.92)',
    padding: 10,
    gap: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
  },
  body: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
});

