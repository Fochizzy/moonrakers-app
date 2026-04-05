import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text from '@/components/ui/Text';
import { styles } from '@/utils/compareStyles';
import { CompareRow } from '@/utils/compareTypes';

type Props = {
  rows: CompareRow[];
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getMetric(row: CompareRow, keys: string[]): number {
  const source = row as Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function pickHighest(rows: CompareRow[], keys: string[]): CompareRow | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => getMetric(b, keys) - getMetric(a, keys))[0] ?? null;
}

function pickLowest(rows: CompareRow[], keys: string[]): CompareRow | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => getMetric(a, keys) - getMetric(b, keys))[0] ?? null;
}

function hasMetricData(rows: CompareRow[], keys: string[]): boolean {
  return rows.some((row) => Math.abs(getMetric(row, keys)) > 0.0001);
}

function formatFixed(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.0';
}

function formatPercent(value: number): string {
  return `${formatFixed(value, 1)}%`;
}

function buildHeadline(rows: CompareRow[]): string {
  if (!rows.length) return 'No comparison data yet.';
  if (rows.length === 1) return `${rows[0].label} is the only selected row.`;

  const winLeader = pickHighest(rows, ['winRate']);
  const winTrailer = pickLowest(rows, ['winRate']);

  if (!winLeader || !winTrailer) return 'Comparison ready.';

  const spread = Math.abs(toNumber(winLeader.winRate) - toNumber(winTrailer.winRate));

  if (spread >= 15) {
    return `${winLeader.label} is the clear front-runner.`;
  }

  if (spread >= 7) {
    return `${winLeader.label} leads, but the field is still competitive.`;
  }

  return `This matchup is close, so secondary metrics matter.`;
}

function buildInsights(rows: CompareRow[]): string[] {
  if (!rows.length) return [];
  if (rows.length === 1) {
    const row = rows[0];
    return [
      `${row.label} is selected for comparison.`,
      `Add more players or groups to generate comparative insights.`,
    ];
  }

  const winLeader = pickHighest(rows, ['winRate']);
  const winTrailer = pickLowest(rows, ['winRate']);
  const prestigeLeader = pickHighest(rows, ['avgPrestigePerGame', 'avgPrestige']);
  const synergyLeader = pickHighest(rows, ['synergyIndex']);
  const efficiencyLeader = pickHighest(rows, ['efficiency']);
  const assistLeader = pickHighest(rows, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists']);
  const objectiveLeader = pickHighest(rows, [
    'objectiveWinRateTracked',
    'objectiveShareOfPrestige',
    'avgObjectivesPerTrackedGame',
  ]);

  const lines: string[] = [];

  if (winLeader && winTrailer && winLeader.id !== winTrailer.id) {
    const spread = Math.abs(toNumber(winLeader.winRate) - toNumber(winTrailer.winRate));

    if (spread >= 15) {
      lines.push(
        `${winLeader.label} has a decisive results edge, outperforming ${winTrailer.label} by ${formatFixed(spread, 1)} win-rate points.`
      );
    } else if (spread >= 7) {
      lines.push(
        `${winLeader.label} currently has the strongest results profile, leading ${winTrailer.label} by ${formatFixed(spread, 1)} win-rate points.`
      );
    } else {
      lines.push(
        `The win-rate spread is only ${formatFixed(spread, 1)} points, so this comparison is being decided more by style and efficiency than by raw results alone.`
      );
    }
  }

  if (prestigeLeader && hasMetricData(rows, ['avgPrestigePerGame', 'avgPrestige'])) {
    lines.push(
      `${prestigeLeader.label} sets the strongest prestige pace at ${formatFixed(
        getMetric(prestigeLeader, ['avgPrestigePerGame', 'avgPrestige']),
        1
      )} per game, which suggests the best scoring engine in this set.`
    );
  }

  if (synergyLeader && hasMetricData(rows, ['synergyIndex'])) {
    lines.push(
      `${synergyLeader.label} has the best synergy signal at ${formatFixed(
        getMetric(synergyLeader, ['synergyIndex']),
        2
      )}, making them the strongest table-fit option if lineup interaction matters.`
    );
  }

  if (efficiencyLeader && hasMetricData(rows, ['efficiency'])) {
    lines.push(
      `${efficiencyLeader.label} leads efficiency at ${formatFixed(
        getMetric(efficiencyLeader, ['efficiency']),
        2
      )}, which usually means better value conversion and less wasted opportunity.`
    );
  }

  if (
    assistLeader &&
    hasMetricData(rows, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists'])
  ) {
    lines.push(
      `${assistLeader.label} stands out most in team-play creation, suggesting stronger support value beyond pure solo output.`
    );
  }

  if (
    objectiveLeader &&
    hasMetricData(rows, [
      'objectiveWinRateTracked',
      'objectiveShareOfPrestige',
      'avgObjectivesPerTrackedGame',
    ])
  ) {
    lines.push(
      `${objectiveLeader.label} appears strongest in objective-driven play, which points to more structured and repeatable board control.`
    );
  }

  if (
    prestigeLeader &&
    synergyLeader &&
    prestigeLeader.id !== synergyLeader.id &&
    lines.length < 6
  ) {
    lines.push(
      `${prestigeLeader.label} leads individual scoring pace, while ${synergyLeader.label} leads synergy. That split suggests the best solo producer is not automatically the best partner fit.`
    );
  }

  return lines.slice(0, 5);
}

function buildBadges(rows: CompareRow[]): string[] {
  if (!rows.length) return [];

  const winLeader = pickHighest(rows, ['winRate']);
  const prestigeLeader = pickHighest(rows, ['avgPrestigePerGame', 'avgPrestige']);
  const synergyLeader = pickHighest(rows, ['synergyIndex']);

  const badges: string[] = [];

  if (winLeader) {
    badges.push(`Best Win %: ${winLeader.label} (${formatPercent(toNumber(winLeader.winRate))})`);
  }

  if (prestigeLeader && hasMetricData(rows, ['avgPrestigePerGame', 'avgPrestige'])) {
    badges.push(
      `Best Prestige Pace: ${prestigeLeader.label} (${formatFixed(
        getMetric(prestigeLeader, ['avgPrestigePerGame', 'avgPrestige']),
        1
      )})`
    );
  }

  if (synergyLeader && hasMetricData(rows, ['synergyIndex'])) {
    badges.push(
      `Best Synergy: ${synergyLeader.label} (${formatFixed(
        getMetric(synergyLeader, ['synergyIndex']),
        2
      )})`
    );
  }

  badges.push(`Compared: ${rows.length}`);

  return badges;
}

export default function CompareSummaryStrip({ rows }: Props) {
  const headline = useMemo(() => buildHeadline(rows), [rows]);
  const insights = useMemo(() => buildInsights(rows), [rows]);
  const badges = useMemo(() => buildBadges(rows), [rows]);

  if (!rows.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEyebrow}>Comparison Summary</Text>
        <Text style={styles.cardMeta}>Interpreted snapshot</Text>
      </View>

      <Text style={styles.cardTitle}>{headline}</Text>

      <View style={styles.insightBadgeRow}>
        {badges.map((badge) => (
          <View key={badge} style={styles.insightBadge}>
            <Text style={styles.insightBadgeText}>{badge}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        {insights.map((line) => (
          <Text key={line} style={styles.matrixWhyText}>
            • {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
