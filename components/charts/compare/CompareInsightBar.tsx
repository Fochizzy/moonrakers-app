import React, { useMemo } from 'react';
import { View } from 'react-native';
import DefinitionRichText from '@/components/ui/DefinitionRichText';
import Text from '@/components/ui/Text';
import {
  PLAYER_FIELD_OPPONENTS_ROW_ID,
  PLAYER_FIELD_SELF_ROW_ID,
} from '@/utils/compareHelpers';
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
      return 'Total Prestige';
    case 'assists':
      return 'Assist Context';
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

function buildTwoPlayerPlaystyleRead(rows: CompareRow[]): string[] {
  if (rows.length !== 2) return [];

  const [firstRow, secondRow] = rows;
  if (!firstRow || !secondRow) return [];

  const paceLeader = pickHighest(rows, ['avgPrestigePerGame', 'avgScorePerGame', 'prestige']);
  const supportLeader = pickHighest(rows, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists']);
  const synergyLeader = pickHighest(rows, ['synergyIndex']);
  const objectiveLeader = pickHighest(rows, ['objectiveShareOfPrestige', 'avgObjectivesPerTrackedGame']);
  const efficiencyLeader = pickHighest(rows, ['efficiency', 'directEfficiency']);
  const seatSensitive = pickHighest(rows, ['turnOrderWinCorrelation']);
  const seatNeutral =
    [...rows].sort(
      (a, b) =>
        Math.abs(getMetric(a, ['turnOrderWinCorrelation'])) -
        Math.abs(getMetric(b, ['turnOrderWinCorrelation']))
    )[0] ?? null;

  const paceTrailer =
    paceLeader?.id === firstRow.id ? secondRow : paceLeader?.id === secondRow.id ? firstRow : secondRow;
  const supportTrailer =
    supportLeader?.id === firstRow.id
      ? secondRow
      : supportLeader?.id === secondRow.id
        ? firstRow
        : secondRow;
  const objectiveTrailer =
    objectiveLeader?.id === firstRow.id
      ? secondRow
      : objectiveLeader?.id === secondRow.id
        ? firstRow
        : secondRow;
  const efficiencyTrailer =
    efficiencyLeader?.id === firstRow.id
      ? secondRow
      : efficiencyLeader?.id === secondRow.id
        ? firstRow
        : secondRow;

  const lines: string[] = [];

  if (paceLeader && paceTrailer) {
    lines.push(
      `Their pace is different: ${paceLeader.label} pushes the faster scoring game at ${formatFixed(getMetric(paceLeader, ['avgPrestigePerGame', 'avgScorePerGame', 'prestige']), 1)} Prestige / Game, while ${paceTrailer.label} sits at ${formatFixed(getMetric(paceTrailer, ['avgPrestigePerGame', 'avgScorePerGame', 'prestige']), 1)} and looks more measured from turn to turn.`
    );
  }

  if (
    supportLeader &&
    supportTrailer &&
    hasMetricData(rows, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists', 'synergyIndex'])
  ) {
    if (synergyLeader && synergyLeader.id !== supportLeader.id) {
      lines.push(
        `At the table, ${supportLeader.label} creates more direct assist value at ${formatFixed(getMetric(supportLeader, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists']), 1)}, but ${synergyLeader.label} carries the stronger synergy profile at ${formatFixed(getMetric(synergyLeader, ['synergyIndex']), 2)}, so one looks more like the feeder and the other more like the cleaner team fit.`
      );
    } else {
      lines.push(
        `At the table, ${supportLeader.label} plays the more connective style with ${formatFixed(getMetric(supportLeader, ['netAssistBenefit', 'avgAssists', 'assistsPerGame', 'assists']), 1)} assist value and ${formatFixed(getMetric(supportLeader, ['synergyIndex']), 2)} synergy, while ${supportTrailer.label} looks more self-contained in how they turn actions into points.`
      );
    }
  }

  if (
    objectiveLeader &&
    objectiveTrailer &&
    hasMetricData(rows, ['objectiveShareOfPrestige', 'avgObjectivesPerTrackedGame'])
  ) {
    lines.push(
      `Objectives push ${objectiveLeader.label}'s game more heavily, with ${formatPercent(getMetric(objectiveLeader, ['objectiveShareOfPrestige']))} of their prestige coming from objectives compared with ${formatPercent(getMetric(objectiveTrailer, ['objectiveShareOfPrestige']))} for ${objectiveTrailer.label}.`
    );
  } else {
    lines.push(
      `Objectives push neither player far away from their base plan, so this matchup is being decided more by pace and table role than by objective spikes.`
    );
  }

  if (efficiencyLeader && efficiencyTrailer) {
    const seatGap =
      seatSensitive && seatNeutral
        ? Math.abs(getMetric(seatSensitive, ['turnOrderWinCorrelation'])) -
          Math.abs(getMetric(seatNeutral, ['turnOrderWinCorrelation']))
        : 0;

    if (seatSensitive && seatNeutral && seatSensitive.id !== seatNeutral.id && seatGap >= 0.18) {
      lines.push(
        `The cleaner closer is ${efficiencyLeader.label}, but ${seatSensitive.label} also shows more seat-order swing at ${formatFixed(getMetric(seatSensitive, ['turnOrderWinCorrelation']), 2)}, so their ceiling looks a little more sensitive to turn timing than ${seatNeutral.label}'s.`
      );
    } else {
      lines.push(
        `The cleaner closer is ${efficiencyLeader.label}, who pairs ${formatFixed(getMetric(efficiencyLeader, ['efficiency', 'directEfficiency']), 2)} efficiency with a ${formatPercent(toNumber(efficiencyLeader.winRate))} Win Rate while ${efficiencyTrailer.label} leaves a bit more value on the table.`
      );
    }
  } else {
    lines.push(
      `Neither player shows a major seat-order dependency, so the cleaner separator here is how each one chooses to pressure the table and convert that pressure into wins.`
    );
  }

  return lines.slice(0, 4);
}

function buildPlayerVsFieldAggregateRead(rows: CompareRow[]): string[] {
  const selfRow = rows.find((row) => row.id === PLAYER_FIELD_SELF_ROW_ID) ?? null;
  const fieldRow = rows.find((row) => row.id === PLAYER_FIELD_OPPONENTS_ROW_ID) ?? null;
  if (!selfRow || !fieldRow) return [];

  const paceLeader =
    getMetric(selfRow, ['avgPrestigePerGame', 'avgScorePerGame']) >=
    getMetric(fieldRow, ['avgPrestigePerGame', 'avgScorePerGame'])
      ? selfRow
      : fieldRow;
  const paceTrailer = paceLeader.id === selfRow.id ? fieldRow : selfRow;
  const supportLeader =
    getMetric(selfRow, ['netAssistBenefit', 'synergyIndex']) >=
    getMetric(fieldRow, ['netAssistBenefit', 'synergyIndex'])
      ? selfRow
      : fieldRow;
  const supportTrailer = supportLeader.id === selfRow.id ? fieldRow : selfRow;
  const objectiveLeader =
    getMetric(selfRow, ['objectiveShareOfPrestige', 'avgObjectivesPerTrackedGame']) >=
    getMetric(fieldRow, ['objectiveShareOfPrestige', 'avgObjectivesPerTrackedGame'])
      ? selfRow
      : fieldRow;
  const objectiveTrailer = objectiveLeader.id === selfRow.id ? fieldRow : selfRow;
  const efficiencyLeader =
    getMetric(selfRow, ['efficiency', 'directEfficiency']) >=
    getMetric(fieldRow, ['efficiency', 'directEfficiency'])
      ? selfRow
      : fieldRow;
  const efficiencyTrailer = efficiencyLeader.id === selfRow.id ? fieldRow : selfRow;
  const seatSensitive =
    Math.abs(getMetric(selfRow, ['turnOrderWinCorrelation'])) >=
    Math.abs(getMetric(fieldRow, ['turnOrderWinCorrelation']))
      ? selfRow
      : fieldRow;
  const seatNeutral = seatSensitive.id === selfRow.id ? fieldRow : selfRow;

  return [
    `Compared with the field, ${selfRow.label} wins ${formatPercent(toNumber(selfRow.winRate))} of the time while the aggregate opponent seat wins ${formatPercent(toNumber(fieldRow.winRate))}, so the current results gap ${toNumber(selfRow.winRate) >= toNumber(fieldRow.winRate) ? 'leans toward your side of the matchup.' : 'still leans toward the opponents as a group.'}`,
    `On pace, ${paceLeader.label} produces ${formatFixed(getMetric(paceLeader, ['avgPrestigePerGame', 'avgScorePerGame']), 1)} Prestige / Game compared with ${formatFixed(getMetric(paceTrailer, ['avgPrestigePerGame', 'avgScorePerGame']), 1)} for ${paceTrailer.label}, which is the clearest read on who is forcing the scoring rhythm.`,
    `${supportLeader.label} carries the stronger support footprint here, pairing ${formatFixed(getMetric(supportLeader, ['netAssistBenefit']), 1)} Net Assist Benefit with ${formatFixed(getMetric(supportLeader, ['synergyIndex']), 2)} Synergy Index, while ${supportTrailer.label} looks more self-driven in how value is created.`,
    `Objectives matter more for ${objectiveLeader.label}, with ${formatPercent(getMetric(objectiveLeader, ['objectiveShareOfPrestige']))} of total prestige coming from objective lines compared with ${formatPercent(getMetric(objectiveTrailer, ['objectiveShareOfPrestige']))} for ${objectiveTrailer.label}.`,
    `The cleaner closer is ${efficiencyLeader.label}, who is converting opportunities at ${formatFixed(getMetric(efficiencyLeader, ['efficiency', 'directEfficiency']), 2)} efficiency versus ${formatFixed(getMetric(efficiencyTrailer, ['efficiency', 'directEfficiency']), 2)} for ${efficiencyTrailer.label}.`,
    `Positioning ${Math.abs(getMetric(seatSensitive, ['turnOrderWinCorrelation'])) >= 0.18 ? `matters more for ${seatSensitive.label}, whose seat-order swing reaches ${formatFixed(getMetric(seatSensitive, ['turnOrderWinCorrelation']), 2)} while ${seatNeutral.label} stays steadier.` : `does not look like the primary separator in this sample, because both sides stay fairly close in seat-order sensitivity.`}`,
  ].slice(0, 6);
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
        `${winLeader.label} is clearly outperforming the field on results, with a Win Rate gap of ${formatFixed(spread, 1)} points over ${winTrailer.label}.`
      );
    } else if (spread >= 7) {
      lines.push(
        `The Win Rates are separated, but not by a huge amount. ${winLeader.label} has the edge over ${winTrailer.label} by ${formatFixed(spread, 1)} points.`
      );
    } else {
      lines.push(
        `This comparison is fairly tight on Wins. The spread from best to worst is only ${formatFixed(spread, 1)} points, so secondary metrics matter more here.`
      );
    }
  }

  if (activeFocusGroup === 'prestige' && prestigeLeader) {
    const prestige = getMetric(prestigeLeader, ['avgPrestigePerGame', 'avgPrestige']);
    lines.push(
      `${prestigeLeader.label} is setting the pace economically. A Prestige / Game rate of ${formatFixed(prestige, 1)} usually means they are converting turns into scoring pressure more consistently than the rest.`
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
        `${synergyLeader.label} has the best Synergy Index signal. If you are building lineups instead of just ranking individuals, this is the player or group to watch most closely.`
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
        `${winLeader.label} is the current results leader, but the best pick depends on whether you care more about pure Wins, Prestige / Game, or Synergy Index.`
      );
    }
    if (prestigeLeader && synergyLeader && prestigeLeader.id !== synergyLeader.id) {
      lines.push(
        `${prestigeLeader.label} leads individual pace, while ${synergyLeader.label} leads Synergy Index. That split suggests the strongest solo performer is not necessarily the best table-fit option.`
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
          ? `${bestPrestige.label} leads Prestige / Game at ${formatFixed(getMetric(bestPrestige, prestigeKeys), 1)}.`
          : null,
        mostPrestige && hasMetricData(rows, totalPrestigeKeys)
          ? `${mostPrestige.label} has the highest Total Prestige at ${formatFixed(getMetric(mostPrestige, totalPrestigeKeys), 0)}.`
          : null,
        strongestConversion
          ? `${strongestConversion.label} converts prestige pressure into the best Win Rate at ${formatPercent(toNumber(strongestConversion.winRate))}.`
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
          ? `${bestSynergy.label} has the strongest team-play profile with Synergy Index ${formatFixed(getMetric(bestSynergy, synergyKeys), 2)}.`
          : null,
        bestWinRate
          ? `${bestWinRate.label} still converts shared table value into the best Win Rate at ${formatPercent(toNumber(bestWinRate.winRate))}.`
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
          ? `${bestRate.label} has the best tracked Win Rate at ${formatPercent(getMetric(bestRate, objectiveRateKeys))}.`
          : null,
        bestShare && hasMetricData(rows, objectiveShareKeys)
          ? `${bestShare.label} gets the largest Objective Share at ${formatPercent(getMetric(bestShare, objectiveShareKeys))}.`
          : null,
        bestVolume && hasMetricData(rows, objectiveVolumeKeys)
          ? `${bestVolume.label} leads Objectives / Game at ${formatFixed(getMetric(bestVolume, objectiveVolumeKeys), 1)}.`
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
          ? `${bestEfficiency.label} leads raw Efficiency at ${formatFixed(getMetric(bestEfficiency, efficiencyKeys), 2)}.`
          : null,
        bestAssisted && hasMetricData(rows, assistedEfficiencyKeys)
          ? `${bestAssisted.label} leads Assisted Efficiency at ${formatFixed(getMetric(bestAssisted, assistedEfficiencyKeys), 2)}.`
          : null,
        cleanest && hasMetricData(rows, cleanestKeys)
          ? `${cleanest.label} is the cleanest closer with Contracts / Failures Ratio ${formatFixed(getMetric(cleanest, cleanestKeys), 2)}.`
          : null,
      ].filter(Boolean) as string[];
    }

    if (activeFocusGroup === 'positioning') {
      const seatKeys = ['avgStartOrder'];
      const correlationKeys = ['turnOrderWinCorrelation'];
      const bestSeat = pickLowest(rows, seatKeys);
      // Widest spread means the biggest seat effect in either direction, so rank by
      // magnitude — the signed maximum would just surface the most late-seat-favouring row.
      const widestSpread =
        [...rows].sort(
          (a, b) => Math.abs(getMetric(b, correlationKeys)) - Math.abs(getMetric(a, correlationKeys))
        )[0] ?? null;
      const mostNeutral =
        [...rows].sort(
          (a, b) => Math.abs(getMetric(a, correlationKeys)) - Math.abs(getMetric(b, correlationKeys))
        )[0] ?? null;

      return [
        bestSeat && hasMetricData(rows, seatKeys)
          ? `${bestSeat.label} tends to start earliest at seat ${formatFixed(getMetric(bestSeat, seatKeys), 1)}.`
          : null,
        widestSpread && hasMetricData(rows, correlationKeys)
          ? `${widestSpread.label} shows the widest Seat Advantage Spread at ${formatFixed(getMetric(widestSpread, correlationKeys), 2)}.`
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
      winLeader ? `${winLeader.label} leads Wins at ${formatPercent(toNumber(winLeader.winRate))}.` : null,
      prestigeLeader && hasMetricData(rows, ['avgPrestigePerGame', 'avgPrestige'])
        ? `${prestigeLeader.label} leads Prestige / Game at ${formatFixed(getMetric(prestigeLeader, ['avgPrestigePerGame', 'avgPrestige']), 1)}.`
        : null,
      synergyLeader && hasMetricData(rows, ['synergyIndex'])
        ? `${synergyLeader.label} leads overall Synergy Index at ${formatFixed(getMetric(synergyLeader, ['synergyIndex']), 2)}.`
        : null,
    ].filter(Boolean) as string[];
  }, [rows, activeFocusGroup]);

  const interpretations = useMemo(
    () => buildInterpretation(rows, activeFocusGroup),
    [rows, activeFocusGroup]
  );
  const fieldAggregateRead = useMemo(() => buildPlayerVsFieldAggregateRead(rows), [rows]);
  const playstyleRead = useMemo(() => buildTwoPlayerPlaystyleRead(rows), [rows]);
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
  const isPlayerVsFieldAggregate = rows.some((row) => row.id === PLAYER_FIELD_SELF_ROW_ID) && rows.some((row) => row.id === PLAYER_FIELD_OPPONENTS_ROW_ID);
  const bottomLines = isPlayerVsFieldAggregate && fieldAggregateRead.length >= 5
    ? fieldAggregateRead
    : modeLabel === 'players' && rows.length === 2 && playstyleRead.length >= 3
      ? playstyleRead
      : readLines;

  if (!rows.length) return null;

  const [firstRow] = rows;
  const comparedLabel =
    selectionLabel && selectionLabel.trim().length
      ? selectionLabel
      : rows.length === 1 && firstRow
        ? firstRow.label
        : `${rows.length} ${modeLabel}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEyebrow}>Insights</Text>
        <DefinitionRichText
          text={`${focusLabel(activeFocusGroup)} view`}
          style={styles.cardMeta}
        />
      </View>

      <Text style={styles.cardTitle}>Current read</Text>

      <View style={styles.selectionContextCard}>
        <Text style={styles.selectionContextLabel}>Selection</Text>
        <Text style={styles.selectionContextValue}>{comparedLabel}</Text>
      </View>

      <View style={styles.insightLineList}>
        {bottomLines.map((line) => (
          <View key={line} style={styles.insightLineCard}>
            <DefinitionRichText
              text={line}
              style={styles.insightLineText}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
