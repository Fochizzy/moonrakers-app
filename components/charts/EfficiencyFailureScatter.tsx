import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import ChartLegend from './ChartLegend';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type Player = { id: string; name: string; color?: string };

type Totals = {
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  assists?: number;
  assistsGiven?: number;
  assistPrestigeGiven?: number;
  failures?: number;
  contracts?: number;
  score?: number;
  winRate?: number;
  earlyLeadFrequency?: number;
  finalWinRate?: number;
  assistedEfficiency?: number;
  assistEfficiency?: number;
  efficiency?: number;
};

type Game = {
  id?: string | number;
  players?: Array<{ id: string; name?: string }>;
  totals?: Record<string, Totals>;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
};

type AggregateMetric = {
  playerId: string;
  name: string;
  color?: string;
  efficiency: number;
  contractFailureRatio: number;
  winRate: number;
  gamesPlayed: number;
  assistedEfficiency?: number;
  assistsGivenPerGame?: number;
  assistsReceivedPerGame?: number;
  earlyLeadFrequency?: number;
  finalWinRate?: number;
};

type Props = {
  metrics?: AggregateMetric[];
  games?: Game[];
  players?: Player[];
  initiallySelectedPlayerId?: string | null;
  title?: string;
};

type ScatterModeKey =
  | 'efficiency_vs_winRate'
  | 'assistedEfficiency_vs_winRate'
  | 'contractFailure_vs_winRate'
  | 'assistsGiven_vs_winRate'
  | 'assistsReceived_vs_winRate'
  | 'earlyLead_vs_finalWinRate';

type ScatterModeConfig = {
  label: string;
  xKey: keyof AggregateMetric;
  yKey: keyof AggregateMetric;
  xLabel: string;
  yLabel: string;
  xPercent?: boolean;
  yPercent?: boolean;
  quadrantLabels: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
};

type ScatterPoint = {
  id: string;
  name: string;
  colorValue: string;
  x: number;
  y: number;
  gamesPlayed: number;
  efficiency: number;
  contractFailureRatio: number;
  winRate: number;
  assistedEfficiency: number;
  assistsGivenPerGame: number;
  assistsReceivedPerGame: number;
  earlyLeadFrequency: number;
  finalWinRate: number;
};

const MODES: Record<ScatterModeKey, ScatterModeConfig> = {
  efficiency_vs_winRate: {
    label: 'Efficiency vs Win Rate',
    xKey: 'efficiency',
    yKey: 'winRate',
    yPercent: true,
    xLabel: 'All Contracts Efficiency',
    yLabel: 'Win Rate',
    quadrantLabels: {
      topLeft: 'Efficient, not closing',
      topRight: 'Elite closer',
      bottomLeft: 'Low pressure value',
      bottomRight: 'Volatile scorer',
    },
  },
  assistedEfficiency_vs_winRate: {
    label: 'Assisted Efficiency vs Win Rate',
    xKey: 'assistedEfficiency',
    yKey: 'winRate',
    yPercent: true,
    xLabel: 'Assisted Efficiency',
    yLabel: 'Win Rate',
    quadrantLabels: {
      topLeft: 'System value',
      topRight: 'Team engine',
      bottomLeft: 'Disconnected',
      bottomRight: 'Fed but not finishing',
    },
  },
  contractFailure_vs_winRate: {
    label: 'Failure Ratio vs Win Rate',
    xKey: 'contractFailureRatio',
    yKey: 'winRate',
    yPercent: true,
    xPercent: true,
    xLabel: 'Contract Failure Ratio',
    yLabel: 'Win Rate',
    quadrantLabels: {
      topLeft: 'Messy but winning',
      topRight: 'High-risk table winner',
      bottomLeft: 'Low-impact safety',
      bottomRight: 'Risk without payoff',
    },
  },
  assistsGiven_vs_winRate: {
    label: 'Assists Given / Game vs Win Rate',
    xKey: 'assistsGivenPerGame',
    yKey: 'winRate',
    yPercent: true,
    xLabel: 'Assists Given / Game',
    yLabel: 'Win Rate',
    quadrantLabels: {
      topLeft: 'Creator, not converting',
      topRight: 'Playmaking winner',
      bottomLeft: 'Quiet facilitator',
      bottomRight: 'Empty volume',
    },
  },
  assistsReceived_vs_winRate: {
    label: 'Assists Received / Game vs Win Rate',
    xKey: 'assistsReceivedPerGame',
    yKey: 'winRate',
    yPercent: true,
    xLabel: 'Assists Received / Game',
    yLabel: 'Win Rate',
    quadrantLabels: {
      topLeft: 'Supported but capped',
      topRight: 'Great finisher',
      bottomLeft: 'Low involvement',
      bottomRight: 'Fed but inefficient',
    },
  },
  earlyLead_vs_finalWinRate: {
    label: 'Early Lead vs Final Win Rate',
    xKey: 'earlyLeadFrequency',
    yKey: 'finalWinRate',
    xPercent: true,
    yPercent: true,
    xLabel: 'Early Lead Frequency',
    yLabel: 'Final Win Rate',
    quadrantLabels: {
      topLeft: 'Late closer',
      topRight: 'Front-runner',
      bottomLeft: 'Slow starter',
      bottomRight: 'Fast fade',
    },
  },
};

const W = 344;
const H = 286;
const PAD_L = 42;
const PAD_R = 18;
const PAD_T = 18;
const PAD_B = 36;

function n(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function getWinnerId(game?: Game): string | null {
  return game?.manualWinnerId ?? game?.selectedWinnerId ?? game?.winnerId ?? null;
}

function getPlayerColor(color?: string): string {
  return typeof color === 'string' && color.trim() ? color : chartColors.purple;
}

function mean(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((s, v) => s + v, 0) / clean.length : 0;
}

function correlation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let numerator = 0;
  let xSpread = 0;
  let ySpread = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    numerator += dx * dy;
    xSpread += dx * dx;
    ySpread += dy * dy;
  }
  const denominator = Math.sqrt(xSpread * ySpread);
  return denominator > 0 ? numerator / denominator : 0;
}

function formatMetric(value: number, percent = false): string {
  if (percent) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(2);
}

function buildMetricsFromGames(players: Player[], games: Game[]): AggregateMetric[] {
  return players.map((player) => {
    let gamesPlayed = 0;
    let wins = 0;
    let totalPrestige = 0;
    let directPrestige = 0;
    let assistReceived = 0;
    let assistsGiven = 0;
    let contracts = 0;
    let failures = 0;
    let earlyLeads = 0;

    for (const game of games) {
      const totals = game.totals?.[player.id];
      if (!totals) continue;
      gamesPlayed += 1;
      if (getWinnerId(game) === player.id) wins += 1;

      const playerTotalPrestige = n(totals.totalPrestige) || n(totals.prestige) || (n(totals.directPrestige) + n(totals.assistPrestigeReceived) + n(totals.objectivePrestige));
      totalPrestige += playerTotalPrestige;
      directPrestige += n(totals.directPrestige);
      assistReceived += n(totals.assistPrestigeReceived);
      assistsGiven += n(totals.assistsGiven) || n(totals.assists) || n(totals.assistPrestigeGiven);
      contracts += n(totals.contracts);
      failures += n(totals.failures);

      const gamePlayers = (game.players ?? []).map((entry) => entry.id);
      const leaderPrestige = Math.max(
        0,
        ...gamePlayers.map((id) => {
          const current = game.totals?.[id];
          return n(current?.totalPrestige) || n(current?.prestige) || (n(current?.directPrestige) + n(current?.assistPrestigeReceived) + n(current?.objectivePrestige));
        }),
      );
      if (playerTotalPrestige > 0 && playerTotalPrestige >= leaderPrestige) {
        earlyLeads += 1;
      }
    }

    const allContractsEfficiency = safeRatio(totalPrestige, contracts + assistsGiven);
    const assistedEfficiency = safeRatio(assistReceived, assistsGiven);
    const contractFailureRatio = safeRatio(failures, failures + contracts);
    const winRate = safeRatio(wins, gamesPlayed);
    const assistsGivenPerGame = safeRatio(assistsGiven, gamesPlayed);
    const assistsReceivedPerGame = safeRatio(assistReceived, gamesPlayed);
    const earlyLeadFrequency = safeRatio(earlyLeads, gamesPlayed);

    return {
      playerId: player.id,
      name: player.name,
      color: player.color,
      efficiency: n((gamesPlayed && allContractsEfficiency) || n((gamesPlayed && 0))) || allContractsEfficiency,
      contractFailureRatio,
      winRate,
      gamesPlayed,
      assistedEfficiency: n((gamesPlayed && assistedEfficiency) || 0) || n(undefined) || assistedEfficiency,
      assistsGivenPerGame,
      assistsReceivedPerGame,
      earlyLeadFrequency,
      finalWinRate: winRate,
    };
  }).filter((entry) => entry.gamesPlayed > 0);
}

function quadrantLabel(point: ScatterPoint | null, meanX: number, meanY: number, mode: ScatterModeConfig): string {
  if (!point) return 'No selection';
  if (point.x >= meanX && point.y >= meanY) return mode.quadrantLabels.topRight;
  if (point.x < meanX && point.y >= meanY) return mode.quadrantLabels.topLeft;
  if (point.x < meanX && point.y < meanY) return mode.quadrantLabels.bottomLeft;
  return mode.quadrantLabels.bottomRight;
}

function normalizePoints(metrics: AggregateMetric[], mode: ScatterModeConfig): ScatterPoint[] {
  return metrics
    .map((metric) => ({
      id: metric.playerId,
      name: metric.name,
      colorValue: getPlayerColor(metric.color),
      x: n(metric[mode.xKey]),
      y: n(metric[mode.yKey]),
      gamesPlayed: n(metric.gamesPlayed),
      efficiency: n(metric.efficiency),
      contractFailureRatio: n(metric.contractFailureRatio),
      winRate: n(metric.winRate),
      assistedEfficiency: n(metric.assistedEfficiency),
      assistsGivenPerGame: n(metric.assistsGivenPerGame),
      assistsReceivedPerGame: n(metric.assistsReceivedPerGame),
      earlyLeadFrequency: n(metric.earlyLeadFrequency),
      finalWinRate: n(metric.finalWinRate),
    }))
    .filter((row) => row.id && Number.isFinite(row.x) && Number.isFinite(row.y));
}

export default function EfficiencyFailureScatter({
  metrics,
  games = [],
  players = [],
  initiallySelectedPlayerId = null,
  title = 'Efficiency / Failure Scatter',
}: Props) {
  const aggregateMetrics = useMemo(() => {
    if (Array.isArray(metrics) && metrics.length) return metrics;
    return buildMetricsFromGames(players, games);
  }, [metrics, players, games]);

  const [modeKey, setModeKey] = useState<ScatterModeKey>('efficiency_vs_winRate');
  const [selectedId, setSelectedId] = useState<string | null>(initiallySelectedPlayerId);

  const mode = MODES[modeKey];
  const points = useMemo(() => normalizePoints(aggregateMetrics, mode), [aggregateMetrics, mode]);

  useEffect(() => {
    if (!points.length) {
      setSelectedId(null);
      return;
    }
    if (!points.some((point) => point.id === selectedId)) {
      setSelectedId(initiallySelectedPlayerId ?? points[0].id);
    }
  }, [points, selectedId, initiallySelectedPlayerId]);

  const selected = points.find((point) => point.id === selectedId) ?? points[0] ?? null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const maxX = Math.max(1, ...xs, 0);
  const maxY = Math.max(1, ...ys, 0);
  const meanX = mean(xs);
  const meanY = mean(ys);
  const corr = correlation(xs, ys);

  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const xPos = (value: number) => PAD_L + (value / maxX) * chartW;
  const yPos = (value: number) => PAD_T + chartH - (value / maxY) * chartH;

  const legendItems = points.map((point) => ({
    key: point.id,
    label: point.name,
    color: point.colorValue,
    value: `${point.gamesPlayed}g`,
  }));

  const topStats = selected
    ? [
        { label: mode.xLabel, value: formatMetric(selected.x, !!mode.xPercent) },
        { label: mode.yLabel, value: formatMetric(selected.y, !!mode.yPercent) },
        { label: 'Games', value: String(selected.gamesPlayed) },
        { label: 'Quadrant', value: quadrantLabel(selected, meanX, meanY, mode) },
      ]
    : undefined;

  if (!points.length) {
    return (
      <ChartShell
        title={title}
        subtitle="Mode-driven scatter for efficiency, support, failure pressure, and conversion."
        explanation="Each point is a player built from merged saved and imported game totals."
        meaning="Point size grows with sample size."
      >
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Not enough data for scatter plot yet.</Text>
        </View>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title={title}
      subtitle="Mode-driven scatter for efficiency, support, failure pressure, and conversion."
      playerColor={selected?.colorValue}
      badge={`${points.length} players`}
      topStats={topStats}
      explanation="The X axis changes with the selected mode. The Y axis is either win rate or final win rate."
      meaning="Upper-right is usually the healthiest quadrant for the selected relationship."
      legend={<ChartLegend items={legendItems} activeKey={selected?.id ?? null} onPressItem={setSelectedId} />}
    >
      <View style={styles.modeRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRowContent}>
          {(Object.entries(MODES) as Array<[ScatterModeKey, ScatterModeConfig]>).map(([key, config]) => {
            const active = key === modeKey;
            return (
              <Pressable key={key} onPress={() => setModeKey(key)} style={[styles.modePill, active && styles.modePillActive]}>
                <Text style={[styles.modePillText, active && styles.modePillTextActive]}>{config.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Svg width={W} height={H}>
        <Rect x={0} y={0} width={W} height={H} rx={18} fill={chartColors.panelBg} stroke={chartColors.borderStrong} />
        <Line x1={PAD_L} y1={PAD_T + chartH} x2={PAD_L + chartW} y2={PAD_T + chartH} stroke={chartColors.borderStrong} />
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke={chartColors.borderStrong} />
        <Line x1={xPos(meanX)} y1={PAD_T} x2={xPos(meanX)} y2={PAD_T + chartH} stroke={withAlpha(chartColors.text, 0.18)} strokeDasharray="4 4" />
        <Line x1={PAD_L} y1={yPos(meanY)} x2={PAD_L + chartW} y2={yPos(meanY)} stroke={withAlpha(chartColors.text, 0.18)} strokeDasharray="4 4" />

        <SvgText x={PAD_L + chartW / 2} y={H - 10} fill={chartColors.subtext} fontSize="11" textAnchor="middle">{mode.xLabel}</SvgText>
        <SvgText x={16} y={PAD_T + chartH / 2} fill={chartColors.subtext} fontSize="11" textAnchor="middle" rotation={-90} origin="16,143">{mode.yLabel}</SvgText>

        <SvgText x={PAD_L + 4} y={PAD_T + 12} fill={chartColors.subtext} fontSize="10">{mode.quadrantLabels.topLeft}</SvgText>
        <SvgText x={PAD_L + chartW - 4} y={PAD_T + 12} fill={chartColors.subtext} fontSize="10" textAnchor="end">{mode.quadrantLabels.topRight}</SvgText>
        <SvgText x={PAD_L + 4} y={PAD_T + chartH - 6} fill={chartColors.subtext} fontSize="10">{mode.quadrantLabels.bottomLeft}</SvgText>
        <SvgText x={PAD_L + chartW - 4} y={PAD_T + chartH - 6} fill={chartColors.subtext} fontSize="10" textAnchor="end">{mode.quadrantLabels.bottomRight}</SvgText>

        {points.map((point) => {
          const cx = xPos(point.x);
          const cy = yPos(point.y);
          const active = point.id === selected?.id;
          const radius = Math.max(5, Math.min(12, 4 + point.gamesPlayed * 0.4));
          return (
            <G key={point.id}>
              {active ? <Circle cx={cx} cy={cy} r={radius + 5} fill={withAlpha(point.colorValue, 0.18)} /> : null}
              <Circle cx={cx} cy={cy} r={radius} fill={point.colorValue} stroke="#ffffff" strokeWidth={active ? 2 : 1} onPress={() => setSelectedId(point.id)} />
              <SvgText x={cx} y={cy - radius - 5} fill={active ? chartColors.text : chartColors.subtext} fontSize="10" fontWeight={active ? '700' : '500'} textAnchor="middle">{point.name}</SvgText>
            </G>
          );
        })}
      </Svg>

      {selected ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{selected.name}</Text>
          <Text style={styles.summaryText}>
            {quadrantLabel(selected, meanX, meanY, mode)} · correlation {corr >= 0 ? '+' : ''}{corr.toFixed(2)}
          </Text>
          <View style={styles.metricGrid}>
            <View style={styles.metricBox}><Text style={styles.metricLabel}>Efficiency</Text><Text style={styles.metricValue}>{selected.efficiency.toFixed(2)}</Text></View>
            <View style={styles.metricBox}><Text style={styles.metricLabel}>Assisted Eff.</Text><Text style={styles.metricValue}>{selected.assistedEfficiency.toFixed(2)}</Text></View>
            <View style={styles.metricBox}><Text style={styles.metricLabel}>Failure Ratio</Text><Text style={styles.metricValue}>{formatMetric(selected.contractFailureRatio, true)}</Text></View>
            <View style={styles.metricBox}><Text style={styles.metricLabel}>Win Rate</Text><Text style={styles.metricValue}>{formatMetric(selected.winRate, true)}</Text></View>
          </View>
        </View>
      ) : null}
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  modeRow: { marginBottom: 10 },
  modeRowContent: { gap: 8, paddingRight: 12 },
  modePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: chartColors.panelBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modePillActive: { borderColor: chartColors.purple, backgroundColor: withAlpha(chartColors.purple, 0.18) },
  modePillText: { color: chartColors.subtext, fontSize: 12, fontWeight: '800' },
  modePillTextActive: { color: chartColors.text },
  emptyCard: { borderRadius: 16, padding: 18, backgroundColor: chartColors.panelBg, borderWidth: 1, borderColor: chartColors.borderStrong },
  emptyText: { color: chartColors.subtext, fontSize: 13, fontWeight: '700' },
  summaryCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    gap: 10,
  },
  summaryTitle: { color: chartColors.text, fontSize: 16, fontWeight: '900' },
  summaryText: { color: chartColors.subtext, fontSize: 12, lineHeight: 18 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricBox: { minWidth: 120, flexGrow: 1, borderRadius: 12, padding: 10, backgroundColor: withAlpha(chartColors.text, 0.04) },
  metricLabel: { color: chartColors.subtext, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  metricValue: { color: chartColors.text, fontSize: 15, fontWeight: '900' },
});
