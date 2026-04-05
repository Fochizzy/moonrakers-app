import React, { useMemo } from 'react';
import { View } from 'react-native';

import Text from '@/components/ui/Text';
import { styles } from '@/utils/compareStyles';

type TelemetryInsight = {
  correlation?: number;
  samples?: number;
  seatLines?: Array<{
    label?: string;
    value?: number;
  }>;
  summary?: string;
};

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCorrelation(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function getHeadline(insight?: TelemetryInsight | null): string {
  const samples = n(insight?.samples);
  const seatLines = Array.isArray(insight?.seatLines) ? insight!.seatLines : [];
  const correlation = n(insight?.correlation);

  if (typeof insight?.summary === 'string' && insight.summary.trim().length > 0) {
    return insight.summary.trim();
  }

  if (samples <= 0 && seatLines.length === 0) {
    return 'No turn-order telemetry yet';
  }

  if (correlation > 0.15) {
    return 'Later seats trend better';
  }

  if (correlation < -0.15) {
    return 'Earlier seats trend better';
  }

  return 'No strong seat trend';
}

export default function CompareTelemetryRow({
  insight,
}: {
  insight?: TelemetryInsight | null;
}) {
  const safeInsight = useMemo<TelemetryInsight>(
    () => ({
      correlation: n(insight?.correlation),
      samples: n(insight?.samples),
      seatLines: Array.isArray(insight?.seatLines) ? insight!.seatLines : [],
      summary: typeof insight?.summary === 'string' ? insight.summary : '',
    }),
    [insight]
  );

  const headline = useMemo(() => getHeadline(safeInsight), [safeInsight]);

  return (
    <View style={styles.telemetryRow}>
      <View style={styles.telemetryCard}>
        <Text style={styles.telemetryLabel}>Turn Order Signal</Text>
        <Text style={styles.telemetryValue}>{formatCorrelation(n(safeInsight.correlation))}</Text>
      </View>

      <View style={styles.telemetryCardWide}>
        <Text style={styles.telemetryLabel}>Summary</Text>
        <Text style={styles.telemetryHeadline}>{headline}</Text>
        <Text style={styles.telemetryMeta}>
          {n(safeInsight.samples)} sample{n(safeInsight.samples) === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}
