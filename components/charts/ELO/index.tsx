import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import ChartLegend from './ChartLegend';
import EloChartPlot from './EloChartPlot';
import { chartColors, withAlpha, getPlayerColor } from '@/utils/chartTheme';
import {
  MODE_OPTIONS,
  buildAnalytics,
  formatValue,
  getModeValues,
  type EloMode,
  type Game,
  type Player,
} from './eloChartUtils';
import { buildCorrelationResults } from './advancedStats';

const MAX_COMPARE_PLAYERS = 5;

export default function EloChart({
  games = [],
  players = [],
  primaryPlayerId = null,
}: {
  games?: Game[];
  players?: Player[];
  primaryPlayerId?: string | null;
}) {
  const [selectedMode, setSelectedMode] = useState<EloMode>('eloDelta');
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    if (games.length) setSelectedGameIndex(games.length - 1);
  }, [games.length]);

  const analytics = useMemo(
    () => buildAnalytics(games, players, selectedMode),
    [games, players, selectedMode]
  );

  const selectedSet = new Set(selectedPlayerIds);

  const comparedSeries = analytics.series.filter((p) =>
    selectedSet.has(p.id)
  );

  const globalCorrelations = useMemo(
    () => buildCorrelationResults(games as any[]),
    [games]
  );

  const strongestGlobal = useMemo(() => {
    return globalCorrelations.reduce((best, cur) =>
      Math.abs(cur.value) > Math.abs(best.value) ? cur : best,
    globalCorrelations[0]);
  }, [globalCorrelations]);

  const keyTakeaway = useMemo(() => {
    if (!strongestGlobal) return null;

    const direction = strongestGlobal.value > 0 ? 'increases' : 'decreases';

    return `${strongestGlobal.label}: when one goes up, the other usually ${direction}.`;
  }, [strongestGlobal]);

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_COMPARE_PLAYERS) return cur;
      return [...cur, id];
    });
  };

  return (
    <ChartShell title="Competitive Meta Dashboard">
      {/* KEY TAKEAWAY */}
      {keyTakeaway && (
        <View style={styles.keyTakeaway}>
          <Text style={styles.keyTakeawayTitle}>Key Takeaway</Text>
          <Text style={styles.keyTakeawayText}>{keyTakeaway}</Text>
        </View>
      )}

      {/* MODE SELECT */}
      <View style={styles.rowWrap}>
        {MODE_OPTIONS.map((m) => (
          <Pressable key={m.key} onPress={() => setSelectedMode(m.key)}>
            <Text style={{ color: '#fff' }}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* PLAYER SELECT */}
      <View style={styles.rowWrap}>
        {players.map((p) => {
          const active = selectedSet.has(p.id);
          return (
            <Pressable key={p.id} onPress={() => togglePlayer(p.id)}>
              <Text style={{ color: active ? '#fff' : '#888' }}>
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* CHART */}
      {comparedSeries.length > 0 && (
        <>
          <ChartLegend
            items={comparedSeries.map((row) => ({
              key: row.id,
              label: row.name ?? '',
              color: row.colorValue,
              value: formatValue(
                row.values?.[selectedGameIndex] ?? 0,
                selectedMode
              ),
            }))}
          />

          <EloChartPlot
            games={games}
            seriesPaths={comparedSeries.map((row) => ({
              ...row,
              values: getModeValues(row, selectedMode),
              points: [],
              path: '',
              isFocused: true,
            }))}
            selectedIndex={selectedGameIndex}
            selectedMode={selectedMode}
            minValue={analytics.minValue}
            maxValue={analytics.maxValue}
            onSelectGame={setSelectedGameIndex}
          />

          {/* PLAYER CARDS */}
          <View style={styles.grid}>
            {comparedSeries.map((row) => (
              <View key={row.id} style={styles.card}>
                <Text style={styles.title}>{row.name}</Text>

                <View style={styles.statsGrid}>
                  <Text style={styles.stat}>
                    Game {selectedGameIndex + 1}
                  </Text>
                  <Text style={styles.stat}>
                    {formatValue(
                      row.values[selectedGameIndex] ?? 0,
                      selectedMode
                    )}
                  </Text>

                  <Text style={styles.stat}>
                    Current {row.summary.currentElo.toFixed(0)}
                  </Text>
                  <Text style={styles.stat}>
                    Peak {row.summary.peakElo.toFixed(0)}
                  </Text>

                  <Text style={styles.stat}>
                    Avg {row.summary.avgElo.toFixed(1)}
                  </Text>
                  <Text style={styles.stat}>
                    Streaks {row.summary.hotStreaks}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* GLOBAL CORRELATIONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Global Correlations</Text>

            <View style={styles.grid}>
              {globalCorrelations.map((c) => {
                const positive = c.value >= 0;
                const strongest = c === strongestGlobal;

                return (
                  <View
                    key={c.label}
                    style={[
                      styles.card,
                      strongest && styles.highlight,
                    ]}
                  >
                    <Text style={styles.label}>{c.label}</Text>

                    <Text
                      style={[
                        styles.value,
                        { color: positive ? '#22c55e' : '#ef4444' },
                      ]}
                    >
                      {c.value.toFixed(2)}
                    </Text>

                    <Text style={styles.sub}>{c.strength}</Text>

                    <Text style={styles.meaning}>
                      {positive
                        ? 'When one goes up, the other also goes up.'
                        : 'When one goes up, the other goes down.'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  card: {
    width: '48%',
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 10,
  },

  highlight: {
    borderWidth: 2,
    borderColor: '#facc15',
  },

  title: {
    color: '#fff',
    fontWeight: '800',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },

  stat: {
    width: '48%',
    color: '#aaa',
    fontSize: 12,
  },

  section: {
    marginTop: 12,
  },

  sectionTitle: {
    color: '#fff',
    fontWeight: '900',
    marginBottom: 8,
  },

  label: {
    color: '#ccc',
    fontSize: 12,
  },

  value: {
    fontSize: 18,
    fontWeight: '900',
  },

  sub: {
    color: '#888',
    fontSize: 12,
  },

  meaning: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },

  keyTakeaway: {
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  keyTakeawayTitle: {
    color: '#fff',
    fontWeight: '900',
    marginBottom: 4,
  },

  keyTakeawayText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
