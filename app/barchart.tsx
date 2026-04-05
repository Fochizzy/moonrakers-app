import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from '@/store/useStore';
import { BarChart } from '@/components/charts/BarChart';
import { RadarChart } from '@/components/charts/RadarChart';
import { AssistNetworkOverview } from '@/components/charts/AssistNetwork';
import { buildPlayerMetrics } from '@/components/charts/core/metricSchema';
import { getStablePlayerColor } from '@/components/charts/core/chartColors';

export default function BarChartScreen() {
  const players = useStore((state: any) => state.players ?? []);

  const chartData = useMemo(() => {
    return (players ?? []).map((player: any) => ({
      id: String(player?.id ?? player?.name ?? Math.random()),
      label: String(player?.name ?? player?.initials ?? 'Unknown Player'),
      color: getStablePlayerColor(
        String(player?.id ?? player?.name ?? 'unknown'),
        player?.color
      ),
      metrics: buildPlayerMetrics(player ?? {}),
    }));
  }, [players]);

  return (
    <ScrollView contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <BarChart data={chartData} title="Player Performance" />
      </View>

      <View style={styles.section}>
        <RadarChart data={chartData} title="Player Shape" />
      </View>

      <View style={styles.section}>
        <AssistNetworkOverview data={chartData} title="Assist Network" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  section: {
    borderRadius: 20,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
});
