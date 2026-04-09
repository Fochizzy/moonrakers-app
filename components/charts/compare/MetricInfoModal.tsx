import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';

export type CompareMetricInfo = {
  key: string;
  label: string;
  description?: string;
  formula?: string;
  betterDirection?: 'higher' | 'lower' | 'neutral';
};

type MetricInfoModalProps = {
  visible: boolean;
  metric?: CompareMetricInfo | null;
  onClose: () => void;
};

function getDirectionText(direction?: CompareMetricInfo['betterDirection']): string {
  switch (direction) {
    case 'higher':
      return 'Higher is better';
    case 'lower':
      return 'Lower is better';
    case 'neutral':
      return 'Context matters';
    default:
      return '';
  }
}

export default function MetricInfoModal({ visible, metric, onClose }: MetricInfoModalProps) {
  const safeMetric = metric ?? null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>Metric detail</Text>
            <Text style={styles.title}>{safeMetric?.label ?? 'Metric info'}</Text>

            {!!safeMetric?.description && <Text style={styles.body}>{safeMetric.description}</Text>}

            {!!safeMetric?.formula && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Formula</Text>
                <Text style={styles.formula}>{safeMetric.formula}</Text>
              </View>
            )}

            {!!safeMetric?.betterDirection && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Interpretation</Text>
                <Text style={styles.body}>{getDirectionText(safeMetric.betterDirection)}</Text>
              </View>
            )}

            {!safeMetric && <Text style={styles.body}>No metric is currently selected.</Text>}

            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '82%',
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    overflow: 'hidden',
  },
  content: {
    padding: 22,
  },
  eyebrow: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  section: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.14)',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    color: '#A5B4FC',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: '#D8E3F0',
  },
  formula: {
    fontSize: 14,
    lineHeight: 22,
    color: '#C4B5FD',
  },
  button: {
    marginTop: 24,
    alignSelf: 'stretch',
    backgroundColor: '#60A5FA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#081120',
    fontSize: 14,
    fontWeight: '900',
  },
});


