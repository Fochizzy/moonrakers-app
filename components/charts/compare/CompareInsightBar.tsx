import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text from '@/components/ui/Text';
import { styles } from '@/utils/compareStyles';
import { CompareRow } from '@/utils/compareTypes';

type FocusGroup =
  | 'outcomes'
  | 'prestige'
  | 'assists'
  | 'objectives'
  | 'efficiency'
  | 'positioning';

type Props = {
  rows: CompareRow[];
  activeFocusGroup: FocusGroup;
  modeLabel?: 'players' | 'groups';
  selectionLabel?: string;
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

function focusLabel(group: FocusGroup): string {
  switch (group) {
    case 'prestige':
      return 'Prestige';
    case 'assists':
      return 'Team Play';
    case 'objectives':
      return 'Objectives';
    case 'efficiency':
      return 'Efficiency';
    case 'positioning':
      return 'Positioning';
    default:
      return 'Overview';
  }
}

function buildInterpretation(rows: CompareRow[], activeFocusGroup: FocusGroup): string[] {
  if (rows.length < 2) {
    return ['Add at least one more player or group to get comparative interpretation.'];
  }

  const winLeader = pickHighest(rows, ['winRate']);
  const winTrailer = pickLowest(rows, ['winRate']);
  const prestigeLeader = pickHighest(rows, ['avgPrestigePerGame', 'avgPrestige']);
  const assistLeader = pickHighest(rows, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists']);
  const synergyLeader = pickHighest(rows, ['synergyIndex']);
  const efficiencyLeader = pickHighest(rows, ['efficiency']);
  const objectiveLeader = pickHighest(rows, [
    'objectiveWinRateTracked',
    'objectiveShareOfPrestige',
    'avgObjectivesPerTrackedGame',
  ]);
  const positioningLeader = pickHighest(rows, ['turnOrderWinCorrelation']);

  const lines: string[] = [];

  if (winLeader && winTrailer && winLeader.id !== winTrailer.id) {
    const spread = Math.abs(toNumber(winLeader.winRate) - toNumber(winTrailer.winRate));
    if (spread >= 15) {
      lines.push(
        `${winLeader.label} is clearly outperforming the field on results, with a win-rate gap of ${formatFixed(spread, 1)} points over ${winTrailer.label}.`
      );
    } else if (spread >= 7) {
      lines.push(
        `The win rates are separated, but not by a huge amount. ${winLeader.label} has the edge over ${winTrailer.label} by ${formatFixed(spread, 1)} points.`
      );
    } else {
      lines.push(
        `This comparison is fairly tight on wins. The spread from best to worst is only ${formatFixed(spread, 1)} points, so secondary metrics matter more here.`
      );
    }
  }

  if (activeFocusGroup === 'prestige' && prestigeLeader) {
    const prestige = getMetric(prestigeLeader, ['avgPrestigePerGame', 'avgPrestige']);
    lines.push(
      `${prestigeLeader.label} is setting the pace economically. A prestige rate of ${formatFixed(prestige, 1)} per game usually means they are converting turns into scoring pressure more consistently than the rest.`
    );
  }

  if (activeFocusGroup === 'assists') {
    if (assistLeader && hasMetricData(rows, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists'])) {
      lines.push(
        `${assistLeader.label} looks like the strongest support piece in this group. Their assist profile suggests they improve shared outcomes, not just personal totals.`
      );
    }
    if (synergyLeader && hasMetricData(rows, ['synergyIndex'])) {
      lines.push(
        `${synergyLeader.label} has the best chemistry signal. If you are building lineups instead of just ranking individuals, this is the player or group to watch most closely.`
      );
    }
  }

  if (activeFocusGroup === 'objectives' && objectiveLeader) {
    lines.push(
      `${objectiveLeader.label} is getting more value through objective play. That usually means their scoring is coming from structured, repeatable board control rather than only opportunistic gains.`
    );
  }

  if (activeFocusGroup === 'efficiency' && efficiencyLeader) {
    const efficiency = getMetric(efficiencyLeader, ['efficiency']);
    lines.push(
      `${efficiencyLeader.label} is the cleanest converter of opportunities into value. An efficiency of ${formatFixed(efficiency, 2)} suggests less waste and better scoring return per action.`
    );
  }

  if (activeFocusGroup === 'positioning' && positioningLeader) {
    const corr = getMetric(positioningLeader, ['turnOrderWinCorrelation']);
    if (Math.abs(corr) >= 0.2) {
      lines.push(
        `${positioningLeader.label} appears more sensitive to seat order than the others. That can mean their results depend more on turn timing and setup advantage.`
      );
    } else {
      lines.push(
        `No one in this comparison looks heavily dependent on seat order, so positioning is probably not the main separator in this set.`
      );
    }
  }

  if (activeFocusGroup === 'outcomes') {
    if (winLeader) {
      lines.push(
        `${winLeader.label} is the current results leader, but the best pick depends on whether you care more about pure wins, prestige generation, or lineup synergy.`
      );
    }
    if (prestigeLeader && synergyLeader && prestigeLeader.id !== synergyLeader.id) {
      lines.push(
        `${prestigeLeader.label} leads individual pace, while ${synergyLeader.label} leads synergy. That split suggests the strongest solo performer is not necessarily the best table-fit option.`
      );
    }
  }

  return lines;
}

export default function CompareInsightBar({
  rows,
  activeFocusGroup,
  modeLabel = 'players',
  selectionLabel,
}: Props) {
  const insights = useMemo(() => {
    if (!rows.length) return [];

    if (activeFocusGroup === 'prestige') {
      const prestigeKeys = ['avgPrestigePerGame', 'avgPrestige'];
      const totalPrestigeKeys = ['totalPrestige', 'prestige'];
      const bestPrestige = pickHighest(rows, prestigeKeys);
      const mostPrestige = pickHighest(rows, totalPrestigeKeys);
      const strongestConversion = pickHighest(rows, ['winRate']);

      return [
        bestPrestige && hasMetricData(rows, prestigeKeys)
          ? `${bestPrestige.label} leads prestige pace at ${formatFixed(getMetric(bestPrestige, prestigeKeys), 1)} per game.`
          : null,
        mostPrestige && hasMetricData(rows, totalPrestigeKeys)
          ? `${mostPrestige.label} has the highest Prestige at ${formatFixed(getMetric(mostPrestige, totalPrestigeKeys), 0)}.`
          : null,
        strongestConversion
          ? `${strongestConversion.label} converts prestige pressure into the best win rate at ${formatPercent(toNumber(strongestConversion.winRate))}.`
          : null,
      ].filter(Boolean) as string[];
    }

    if (activeFocusGroup === 'assists') {
      const assistKeys = ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists'];
      const synergyKeys = ['synergyIndex'];
      const bestAssist = pickHighest(rows, assistKeys);
      const bestSynergy = pickHighest(rows, synergyKeys);
      const bestWinRate = pickHighest(rows, ['winRate']);

      return [
        bestAssist && hasMetricData(rows, assistKeys)
          ? `${bestAssist.label} creates the most assist value at ${formatFixed(getMetric(bestAssist, assistKeys), 1)}.`
          : null,
        bestSynergy && hasMetricData(rows, synergyKeys)
          ? `${bestSynergy.label} has the strongest team-play profile with synergy ${formatFixed(getMetric(bestSynergy, synergyKeys), 2)}.`
          : null,
        bestWinRate
          ? `${bestWinRate.label} still converts shared table value into the best win rate at ${formatPercent(toNumber(bestWinRate.winRate))}.`
          : null,
      ].filter(Boolean) as string[];
    }

    if (activeFocusGroup === 'objectives') {
      const objectiveRateKeys = ['objectiveWinRateTracked'];
      const objectiveShareKeys = ['objectiveShareOfPrestige'];
      const objectiveVolumeKeys = ['avgObjectivesPerTrackedGame'];
      const bestRate = pickHighest(rows, objectiveRateKeys);
      const bestShare = pickHighest(rows, objectiveShareKeys);
      const bestVolume = pickHighest(rows, objectiveVolumeKeys);

      return [
        bestRate && hasMetricData(rows, objectiveRateKeys)
          ? `${bestRate.label} has the best tracked objective win rate at ${formatPercent(getMetric(bestRate, objectiveRateKeys))}.`
          : null,
        bestShare && hasMetricData(rows, objectiveShareKeys)
          ? `${bestShare.label} gets the largest share of prestige from objectives at ${formatPercent(getMetric(bestShare, objectiveShareKeys))}.`
          : null,
        bestVolume && hasMetricData(rows, objectiveVolumeKeys)
          ? `${bestVolume.label} averages ${formatFixed(getMetric(bestVolume, objectiveVolumeKeys), 1)} objectives in tracked games.`
          : null,
      ].filter(Boolean) as string[];
    }

    if (activeFocusGroup === 'efficiency') {
      const efficiencyKeys = ['efficiency'];
      const assistedEfficiencyKeys = ['assistedEfficiency'];
      const cleanestKeys = ['contractFailureRatio'];
      const bestEfficiency = pickHighest(rows, efficiencyKeys);
      const bestAssisted = pickHighest(rows, assistedEfficiencyKeys);
      const cleanest = pickLowest(rows, cleanestKeys);

      return [
        bestEfficiency && hasMetricData(rows, efficiencyKeys)
          ? `${bestEfficiency.label} leads raw efficiency at ${formatFixed(getMetric(bestEfficiency, efficiencyKeys), 2)}.`
          : null,
        bestAssisted && hasMetricData(rows, assistedEfficiencyKeys)
          ? `${bestAssisted.label} leads assisted efficiency at ${formatFixed(getMetric(bestAssisted, assistedEfficiencyKeys), 2)}.`
          : null,
        cleanest && hasMetricData(rows, cleanestKeys)
          ? `${cleanest.label} is the cleanest closer with failure ratio ${formatFixed(getMetric(cleanest, cleanestKeys), 2)}.`
          : null,
      ].filter(Boolean) as string[];
    }

    if (activeFocusGroup === 'positioning') {
      const seatKeys = ['avgStartOrder'];
      const correlationKeys = ['turnOrderWinCorrelation'];
      const bestSeat = pickLowest(rows, seatKeys);
      const bestCorrelation = pickHighest(rows, correlationKeys);
      const mostNeutral =
        [...rows].sort(
          (a, b) => Math.abs(getMetric(a, correlationKeys)) - Math.abs(getMetric(b, correlationKeys))
        )[0] ?? null;

      return [
        bestSeat && hasMetricData(rows, seatKeys)
          ? `${bestSeat.label} tends to start earliest at seat ${formatFixed(getMetric(bestSeat, seatKeys), 1)}.`
          : null,
        bestCorrelation && hasMetricData(rows, correlationKeys)
          ? `${bestCorrelation.label} gets the strongest seat-order win signal at ${formatFixed(getMetric(bestCorrelation, correlationKeys), 2)}.`
          : null,
        mostNeutral && hasMetricData(rows, correlationKeys)
          ? `${mostNeutral.label} is least sensitive to seat position at ${formatFixed(Math.abs(getMetric(mostNeutral, correlationKeys)), 2)}.`
          : null,
      ].filter(Boolean) as string[];
    }

    const winLeader = pickHighest(rows, ['winRate']);
    const prestigeLeader = pickHighest(rows, ['avgPrestigePerGame', 'avgPrestige']);
    const synergyLeader = pickHighest(rows, ['synergyIndex']);

    return [
      winLeader ? `${winLeader.label} leads wins at ${formatPercent(toNumber(winLeader.winRate))}.` : null,
      prestigeLeader && hasMetricData(rows, ['avgPrestigePerGame', 'avgPrestige'])
        ? `${prestigeLeader.label} leads prestige pace at ${formatFixed(getMetric(prestigeLeader, ['avgPrestigePerGame', 'avgPrestige']), 1)} per game.`
        : null,
      synergyLeader && hasMetricData(rows, ['synergyIndex'])
        ? `${synergyLeader.label} leads overall synergy at ${formatFixed(getMetric(synergyLeader, ['synergyIndex']), 2)}.`
        : null,
    ].filter(Boolean) as string[];
  }, [rows, activeFocusGroup]);

  const interpretations = useMemo(
    () => buildInterpretation(rows, activeFocusGroup),
    [rows, activeFocusGroup]
  );
  const readLines = useMemo(() => {
    const seen = new Set<string>();

    return [...insights, ...interpretations]
      .filter((line) => {
        if (!line || seen.has(line)) return false;
        seen.add(line);
        return true;
      })
      .slice(0, 4);
  }, [insights, interpretations]);

  if (!rows.length) return null;

  const comparedLabel =
    selectionLabel && selectionLabel.trim().length
      ? selectionLabel
      : rows.length === 1
        ? rows[0].label
        : `${rows.length} ${modeLabel}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEyebrow}>Insights</Text>
        <Text style={styles.cardMeta}>{focusLabel(activeFocusGroup)} view</Text>
      </View>

      <Text style={styles.cardTitle}>Current read</Text>
      <Text style={styles.helper} numberOfLines={2}>
        Based on this selection: {comparedLabel}.
      </Text>

      <View style={styles.insightBadgeRow}>
        <View style={styles.insightBadge}>
          <Text style={styles.insightBadgeText}>Compared: {comparedLabel}</Text>
        </View>
        <View style={styles.insightBadge}>
          <Text style={styles.insightBadgeText}>Focus: {focusLabel(activeFocusGroup)}</Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {readLines.map((line) => (
          <Text key={line} style={styles.matrixWhyText} numberOfLines={3}>
            {`\u2022 ${line}`}
          </Text>
        ))}
      </View>
    </View>
  );
}
