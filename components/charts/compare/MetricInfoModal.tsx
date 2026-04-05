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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '80%',
    borderRadius: 20,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    color: '#A78BFA',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E5E7EB',
  },
  formula: {
    fontSize: 14,
    lineHeight: 21,
    color: '#C4B5FD',
  },
  button: {
    marginTop: 22,
    alignSelf: 'flex-end',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
