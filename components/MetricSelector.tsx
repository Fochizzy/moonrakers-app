import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import type { MetricDefinition } from '@/utils/chartMetrics';

type Props<T> = {
  title?: string;
  metrics: MetricDefinition<T>[];
  selectedKey: string;
  onSelect: (key: string) => void;
};

const sciFi = {
  panel: '#0C132A',
  panel2: '#121B36',
  border: 'rgba(120,160,255,0.18)',
  borderStrong: 'rgba(99,230,255,0.38)',
  text: '#F4F7FF',
  subtext: '#93A0BE',
  cyan: '#63E6FF',
};

export default function MetricSelector<T>({
  title = 'Metric',
  metrics,
  selectedKey,
  onSelect,
}: Props<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {metrics.map((metric) => {
          const active = metric.key === selectedKey;

          return (
            <Pressable
              key={metric.key}
              onPress={() => onSelect(metric.key)}
              style={[
                styles.pill,
                active && styles.pillActive,
              ]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {metric.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  title: {
    color: sciFi.subtext,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    gap: 10,
    paddingRight: 12,
  },
  pill: {
    borderWidth: 1,
    borderColor: sciFi.border,
    backgroundColor: sciFi.panel,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  pillActive: {
    borderColor: sciFi.borderStrong,
    backgroundColor: sciFi.panel2,
    shadowColor: sciFi.cyan,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pillText: {
    color: sciFi.subtext,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pillTextActive: {
    color: sciFi.text,
  },
});


