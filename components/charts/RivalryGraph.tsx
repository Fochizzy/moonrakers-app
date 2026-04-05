import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import { chartColors, withAlpha } from '@/utils/chartTheme';

const WIDTH = 340;
const PAD_X = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 12;
const LABEL_W = 104;
const VALUE_W = 60;
const CENTER_GAP = 8;
const ROW_H = 42;

const CHART_W = WIDTH - PAD_X * 2 - LABEL_W - VALUE_W;
const MID_X = PAD_X + LABEL_W + CHART_W / 2;
const HALF_W = CHART_W / 2 - CENTER_GAP;

type Player = {
  id: string;
  name: string;
  color?: string;
};

type GameTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  assistPrestigeSent?: number;
  assistPrestigeGiven?: number;
  assistsGiven?: number;
  assists?: number;
  score?: number;
};

type Game = {
  id?: string | number;
  createdAt?: number;
  players?: Array<{ id: string }>;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, GameTotals>;
};

type ModeKey = 'dominance' | 'winRate' | 'prestigeMargin' | 'synergy';

type RivalryRow = {
  opponentId: string;
  opponentName: string;
  opponentColor: string;
  gamesTogether: number;
  wins: number;
  losses: number;
  playerPrestigeTotal: number;
  opponentPrestigeTotal: number;
  netAssistBenefitTotal: number;
  dominance: number;
  winRate: number;
  prestigeMargin: number;
  synergy: number;
  intensity: number;
  recentEdge: number;
  momentum: number;
};

type Props = {
  playerId: string;
  games?: Game[];
  players?: Player[];
};

const EMPTY_GAMES: Game[] = [];
const EMPTY_PLAYERS: Player[] = [];

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getWinnerId(game?: Game): string | undefined {
  return game ? game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId : undefined;
}

function getTotalPrestige(totals?: GameTotals | null): number {
  if (!totals) return 0;

  if (typeof totals.totalPrestige === 'number' && Number.isFinite(totals.totalPrestige)) {
    return totals.totalPrestige;
  }

  if (typeof totals.prestige === 'number' && Number.isFinite(totals.prestige)) {
    return totals.prestige;
  }

  return (
    toNumber(totals.directPrestige) +
    toNumber(totals.assistPrestigeReceived) +
    toNumber(totals.objectivePrestige)
  );
}

function getAssistOut(totals?: GameTotals | null): number {
  return Math.max(
    0,
    toNumber(totals?.assistPrestigeSent) ||
      toNumber(totals?.assistPrestigeGiven) ||
      toNumber(totals?.assistsGiven) ||
      toNumber(totals?.assists),
  );
}

function getPlayerColor(color?: string): string {
  if (typeof color === 'string' && color.trim()) return color;
  return chartColors.accent;
}

function formatSigned(value: number, digits = 2): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getModeLabel(mode: ModeKey): string {
  switch (mode) {
    case 'dominance':
      return 'Dominance';
    case 'winRate':
      return 'Win Rate';
    case 'prestigeMargin':
      return 'Avg Prestige Margin';
    case 'synergy':
      return 'Synergy';
    default:
      return 'Value';
  }
}

function getModeDescription(mode: ModeKey): string {
  switch (mode) {
    case 'dominance':
      return 'Wins minus losses per shared game';
    case 'winRate':
      return 'Share of wins against this opponent';
    case 'prestigeMargin':
      return 'Average prestige edge per shared game';
    case 'synergy':
      return 'Relative assist in/out edge per shared game';
    default:
      return 'Comparison value';
  }
}

function getModeValue(row: RivalryRow, mode: ModeKey): number {
  switch (mode) {
    case 'winRate':
      return row.winRate * 2 - 1;
    case 'prestigeMargin':
      return row.prestigeMargin;
    case 'synergy':
      return row.synergy;
    case 'dominance':
    default:
      return row.dominance;
  }
}

function formatModeValue(row: RivalryRow, mode: ModeKey): string {
  switch (mode) {
    case 'winRate':
      return formatPct(row.winRate);
    case 'prestigeMargin':
      return formatSigned(row.prestigeMargin);
    case 'synergy':
      return formatSigned(row.synergy);
    case 'dominance':
    default:
      return formatSigned(row.dominance);
  }
}

function getDeltaWord(value: number, mode: ModeKey): string {
  const amount = Math.abs(value);

  if (mode === 'winRate') {
    if (amount < 0.08) return 'slightly';
    if (amount < 0.2) return 'clearly';
    return 'heavily';
  }

  if (amount < 0.2) return 'slightly';
  if (amount < 0.75) return 'clearly';
  return 'heavily';
}

function getOverallEdgeText(row: RivalryRow, playerAName: string): string {
  if (row.gamesTogether < 2) {
    return `${playerAName} and ${row.opponentName} only played a tiny sample together.`;
  }

  const dominanceGap = row.dominance;
  const prestigeGap = row.prestigeMargin;
  const synergyGap = row.synergy;
  const favoredName =
    row.winRate >= 0.5 ? playerAName : row.opponentName;
  const intensityWord = getDeltaWord(Math.abs(row.winRate - 0.5) * 2, 'winRate');

  if (Math.abs(row.winRate - 0.5) < 0.08 && Math.abs(prestigeGap) < 0.35) {
    return `${playerAName} and ${row.opponentName} are very even overall.`;
  }

  let detail = '';
  if (Math.abs(prestigeGap) >= Math.abs(synergyGap) && Math.abs(prestigeGap) > 0.15) {
    detail =
      prestigeGap > 0
        ? `${playerAName} scores more prestige per game`
        : `${row.opponentName} scores more prestige per game`;
  } else if (Math.abs(synergyGap) > 0.15) {
    detail =
      synergyGap > 0
        ? `${playerAName} gets more help value from the team flow`
        : `${row.opponentName} gets more help value from the team flow`;
  } else if (Math.abs(dominanceGap) > 0.05) {
    detail =
      dominanceGap > 0
        ? `${playerAName} wins more of the close results`
        : `${row.opponentName} wins more of the close results`;
  }

  return detail
    ? `${favoredName} ${intensityWord} leads this matchup, and ${detail}.`
    : `${favoredName} ${intensityWord} leads this matchup overall.`;
}

function getSimpleMetricSentence(
  row: RivalryRow,
  mode: ModeKey,
  playerAName: string,
): string {
  const value = getModeValue(row, mode);
  const absValue = Math.abs(value);
  const strength = getDeltaWord(absValue, mode);

  if (mode === 'winRate') {
    if (Math.abs(row.winRate - 0.5) < 0.05) {
      return `${playerAName} and ${row.opponentName} win at almost the same rate.`;
    }
    return value >= 0
      ? `${playerAName} ${strength} wins this matchup more often than ${row.opponentName}.`
      : `${row.opponentName} ${strength} wins this matchup more often than ${playerAName}.`;
  }

  if (mode === 'prestigeMargin') {
    if (absValue < 0.15) {
      return `${playerAName} and ${row.opponentName} score almost the same prestige per game.`;
    }
    return value >= 0
      ? `${playerAName} ${strength} scores more prestige per game than ${row.opponentName}.`
      : `${row.opponentName} ${strength} scores more prestige per game than ${playerAName}.`;
  }

  if (mode === 'synergy') {
    if (absValue < 0.15) {
      return `${playerAName} and ${row.opponentName} get about the same support value from assists.`;
    }
    return value >= 0
      ? `${playerAName} ${strength} gets better assist flow than ${row.opponentName}.`
      : `${row.opponentName} ${strength} gets better assist flow than ${playerAName}.`;
  }

  if (absValue < 0.08) {
    return `${playerAName} and ${row.opponentName} have very similar overall results.`;
  }
  return value >= 0
    ? `${playerAName} ${strength} controls more of the results in this matchup.`
    : `${row.opponentName} ${strength} controls more of the results in this matchup.`;
}

function getMomentumSentence(row: RivalryRow, playerAName: string): string {
  if (Math.abs(row.momentum) < 0.08) {
    return `Recent games look similar to the full matchup history.`;
  }

  return row.momentum > 0
    ? `${playerAName} has been doing better lately than in the full sample.`
    : `${row.opponentName} has been doing better lately than in the full sample.`;
}

function getVerdict(row: RivalryRow, playerAName: string): string {
  if (row.gamesTogether < 2) return 'Tiny sample';
  if (row.winRate >= 0.75) return `${playerAName} favored`;
  if (row.winRate <= 0.25) return `${row.opponentName} favored`;
  if (Math.abs(row.momentum) > 0.22) return row.momentum > 0 ? `${playerAName} trending up` : `${row.opponentName} trending up`;
  if (Math.abs(row.prestigeMargin) < 0.35) return 'Usually close';
  return row.prestigeMargin > 0 ? `${playerAName} edges on points` : `${row.opponentName} edges on points`;
}

function getGameSortValue(game: Game, index: number): number {
  const createdAt = toNumber(game.createdAt);
  if (createdAt > 0) return createdAt;
  if (typeof game.id === 'number') return game.id;
  if (typeof game.id === 'string' && /^\d+$/.test(game.id)) return Number(game.id);
  return index;
}

function getRivalryIntensity(
  gamesTogether: number,
  winRate: number,
  prestigeMargin: number,
  momentum: number,
): number {
  const parity = 1 - Math.abs(winRate - 0.5) * 2;
  const closeness = 1 - Math.min(1, Math.abs(prestigeMargin) / 4);
  return gamesTogether * 0.65 + parity * 7 + closeness * 3 + Math.abs(momentum) * 2;
}

type AnimatedBarProps = {
  row: RivalryRow;
  mode: ModeKey;
  maxAbs: number;
  selected: boolean;
  playerAColor: string;
  playerBColor: string;
  y: number;
};

function AnimatedLadderBar({
  row,
  mode,
  maxAbs,
  selected,
  playerAColor,
  playerBColor,
  y,
}: AnimatedBarProps) {
  const rawValue = getModeValue(row, mode);
  const positive = rawValue >= 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(Math.abs(rawValue) / Math.max(1, maxAbs), {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [maxAbs, rawValue, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: HALF_W * progress.value,
    opacity: selected ? 1 : 0.84,
    transform: [{ scaleY: selected ? 1.08 : 1 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    width: HALF_W * progress.value,
    opacity: selected ? 0.18 : 0,
  }));

  const anchorStyle = positive ? styles.barAnchorRight : styles.barAnchorLeft;
  const fill = positive ? playerAColor : playerBColor;
  const dotX =
    positive
      ? MID_X + CENTER_GAP + HALF_W * (Math.abs(rawValue) / Math.max(1, maxAbs))
      : MID_X - CENTER_GAP - HALF_W * (Math.abs(rawValue) / Math.max(1, maxAbs));

  return (
    <>
      <Animated.View
        style={[
          styles.barHalo,
          anchorStyle,
          {
            top: y + 8,
            backgroundColor: fill,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.barFill,
          anchorStyle,
          {
            top: y + 12,
            backgroundColor: fill,
          },
          barStyle,
        ]}
      />
      <Circle
        cx={dotX}
        cy={y + 18}
        r={selected ? 5 : 3.5}
        fill={positive ? playerAColor : playerBColor}
        opacity={0.95}
      />
    </>
  );
}

export default function RivalryGraph({
  playerId,
  games = EMPTY_GAMES,
  players = EMPTY_PLAYERS,
}: Props) {
  const [mode, setMode] = useState<ModeKey>('dominance');
  const [selectedPlayerAId, setSelectedPlayerAId] = useState<string | null>(playerId ?? null);
  const [selectedPlayerBId, setSelectedPlayerBId] = useState<string | null>(null);

  useEffect(() => {
    if (!players.length) {
      setSelectedPlayerAId(null);
      setSelectedPlayerBId(null);
      return;
    }

    const ids = new Set(players.map((player) => player.id));
    const nextA =
      selectedPlayerAId && ids.has(selectedPlayerAId)
        ? selectedPlayerAId
        : ids.has(playerId)
          ? playerId
          : players[0]?.id ?? null;

    const fallbackB = players.find((player) => player.id !== nextA)?.id ?? null;
    const nextB =
      selectedPlayerBId && ids.has(selectedPlayerBId) && selectedPlayerBId !== nextA
        ? selectedPlayerBId
        : fallbackB;

    if (nextA !== selectedPlayerAId) setSelectedPlayerAId(nextA);
    if (nextB !== selectedPlayerBId) setSelectedPlayerBId(nextB);
  }, [playerId, players, selectedPlayerAId, selectedPlayerBId]);

  const playerA = useMemo(
    () => players.find((p) => p.id === selectedPlayerAId) ?? null,
    [selectedPlayerAId, players],
  );

  const playerB = useMemo(
    () => players.find((p) => p.id === selectedPlayerBId) ?? null,
    [selectedPlayerBId, players],
  );

  const data = useMemo(() => {
    if (!selectedPlayerAId) return [];

    const orderedGames = [...games]
      .map((game, index) => ({ game, sortValue: getGameSortValue(game, index) }))
      .sort((a, b) => a.sortValue - b.sortValue);

    const rows: RivalryRow[] = players
      .filter((p) => p.id !== selectedPlayerAId)
      .map((opponent) => {
        let gamesTogether = 0;
        let wins = 0;
        let losses = 0;
        let playerPrestigeTotal = 0;
        let opponentPrestigeTotal = 0;
        let netAssistBenefitTotal = 0;
        let recentWeightedEdge = 0;
        let recentWeightTotal = 0;
        let recentWins = 0;
        let recentLosses = 0;

        orderedGames.forEach(({ game }, index) => {
          const mine = game.totals?.[selectedPlayerAId];
          const theirs = game.totals?.[opponent.id];
          if (!mine || !theirs) return;

          const ids = new Set((game.players ?? []).map((p) => p.id));
          if (ids.size > 0 && (!ids.has(selectedPlayerAId) || !ids.has(opponent.id))) return;

          gamesTogether += 1;

          const myPrestige = getTotalPrestige(mine);
          const theirPrestige = getTotalPrestige(theirs);

          const myAssistIn = toNumber(mine.assistPrestigeReceived);
          const myAssistOut = getAssistOut(mine);
          const theirAssistIn = toNumber(theirs.assistPrestigeReceived);
          const theirAssistOut = getAssistOut(theirs);

          playerPrestigeTotal += myPrestige;
          opponentPrestigeTotal += theirPrestige;
          netAssistBenefitTotal += (myAssistIn - myAssistOut) - (theirAssistIn - theirAssistOut);

          const winnerId = getWinnerId(game);
          const playerWon = winnerId === selectedPlayerAId;
          const opponentWon = winnerId === opponent.id;

          if (playerWon) wins += 1;
          if (opponentWon) losses += 1;

          const recencyWeight = 1 + index / Math.max(1, orderedGames.length);
          const signedEdge =
            playerWon ? 1 : opponentWon ? -1 : clamp((myPrestige - theirPrestige) / 10, -1, 1);

          recentWeightedEdge += signedEdge * recencyWeight;
          recentWeightTotal += recencyWeight;

          const recencyThreshold = Math.max(0, orderedGames.length - 5);
          if (index >= recencyThreshold) {
            if (playerWon) recentWins += 1;
            if (opponentWon) recentLosses += 1;
          }
        });

        const dominance = safeDiv(wins - losses, Math.max(1, gamesTogether));
        const winRate = safeDiv(wins, gamesTogether);
        const prestigeMargin = safeDiv(playerPrestigeTotal - opponentPrestigeTotal, gamesTogether);
        const synergy = safeDiv(netAssistBenefitTotal, gamesTogether);
        const recentEdge = safeDiv(recentWeightedEdge, recentWeightTotal);
        const recentWinRate = safeDiv(recentWins, Math.max(1, recentWins + recentLosses));
        const momentum = recentWinRate - winRate;
        const intensity = getRivalryIntensity(
          gamesTogether,
          winRate,
          prestigeMargin,
          momentum,
        );

        return {
          opponentId: opponent.id,
          opponentName: opponent.name,
          opponentColor: getPlayerColor(opponent.color),
          gamesTogether,
          wins,
          losses,
          playerPrestigeTotal,
          opponentPrestigeTotal,
          netAssistBenefitTotal,
          dominance,
          winRate,
          prestigeMargin,
          synergy,
          intensity,
          recentEdge,
          momentum,
        };
      })
      .filter((row) => row.gamesTogether > 0);

    rows.sort((a, b) => b.intensity - a.intensity || b.gamesTogether - a.gamesTogether);
    return rows;
  }, [games, selectedPlayerAId, players]);

  const selected = useMemo(() => {
    if (!selectedPlayerBId) return null;
    return data.find((row) => row.opponentId === selectedPlayerBId) ?? null;
  }, [data, selectedPlayerBId]);

  useEffect(() => {
    if (!data.length) return;
    if (!selectedPlayerBId || !data.some((row) => row.opponentId === selectedPlayerBId)) {
      const fallback = data[0]?.opponentId ?? null;
      if (fallback !== selectedPlayerBId) setSelectedPlayerBId(fallback);
    }
  }, [data, selectedPlayerBId]);

  const playerAColor = playerA ? getPlayerColor(playerA.color) : chartColors.accent;
  const playerBColor = playerB ? getPlayerColor(playerB.color) : chartColors.red;

  const maxAbs = useMemo(() => {
    const rows = selected ? [selected] : [];
    const values = rows.map((row) => Math.abs(getModeValue(row, mode)));
    return Math.max(1, ...values, 1);
  }, [selected, mode]);

  const chartRows = selected ? [selected] : [];
  const height = Math.max(96, PAD_TOP + PAD_BOTTOM + Math.max(1, chartRows.length) * ROW_H);

  const noDirectMatchup =
    !!selectedPlayerAId && !!selectedPlayerBId && !selected;

  const playerAName = playerA?.name ?? 'Player A';
  const playerBName = playerB?.name ?? 'Player B';

  const handleSelectPlayerA = (playerIdValue: string) => {
    if (playerIdValue === selectedPlayerBId) return;
    setSelectedPlayerAId(playerIdValue);
  };

  const handleSelectPlayerB = (playerIdValue: string) => {
    if (playerIdValue === selectedPlayerAId) return;
    setSelectedPlayerBId(playerIdValue);
  };

  if (!players.length) {
    return (
      <ChartShell
        title="Rivalry Ladder"
        subtitle="Pick the exact two players you want to compare."
        playerColor={playerAColor}
        badge={getModeLabel(mode)}
        explanation="Choose Player A and Player B to compare one exact rivalry."
        meaning="Positive values favor Player A. Negative values favor Player B."
      >
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No players available yet.</Text>
        </View>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title="Rivalry Ladder"
      subtitle="Pick the exact two players you want to compare."
      playerColor={playerAColor}
      badge={getModeLabel(mode)}
      topStats={
        selected
          ? [
              { label: 'Player A', value: playerAName },
              { label: 'Player B', value: selected.opponentName },
              { label: 'Games', value: String(selected.gamesTogether) },
              {
                label: mode === 'prestigeMargin' ? 'Prestige Δ' : getModeLabel(mode),
                value: formatModeValue(selected, mode),
              },
            ]
          : undefined
      }
      explanation="Use Player A and Player B below to lock the graph to one exact rivalry."
      meaning={`${getModeDescription(mode)}. Right favors ${playerAName}, left favors ${playerBName}.`}
    >
      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Compare these two players</Text>

        <Text style={styles.selectorLabel}>
          Player A: <Text style={[styles.selectorValue, { color: playerAColor }]}>{playerAName}</Text>
        </Text>
        <View style={styles.selectorList}>
          {players.map((p) => {
            const isSelected = p.id === selectedPlayerAId;
            const disabled = p.id === selectedPlayerBId;
            const pillColor = getPlayerColor(p.color);

            return (
              <Pressable
                key={`a-${p.id}`}
                onPress={() => !disabled && handleSelectPlayerA(p.id)}
                disabled={disabled}
                style={[
                  styles.playerPill,
                  isSelected && {
                    borderColor: withAlpha(pillColor, 0.8),
                    backgroundColor: withAlpha(pillColor, 0.18),
                  },
                  disabled && styles.playerPillDisabled,
                ]}
              >
                <View
                  style={[
                    styles.playerDot,
                    { backgroundColor: disabled ? withAlpha(pillColor, 0.35) : pillColor },
                  ]}
                />
                <Text
                  style={[
                    styles.playerPillText,
                    isSelected && styles.playerPillTextSelected,
                    disabled && styles.playerPillTextDisabled,
                  ]}
                >
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.selectorLabel}>
          Player B: <Text style={[styles.selectorValue, { color: playerBColor }]}>{playerBName}</Text>
        </Text>
        <View style={styles.selectorList}>
          {players.map((p) => {
            const isSelected = p.id === selectedPlayerBId;
            const disabled = p.id === selectedPlayerAId;
            const pillColor = getPlayerColor(p.color);

            return (
              <Pressable
                key={`b-${p.id}`}
                onPress={() => !disabled && handleSelectPlayerB(p.id)}
                disabled={disabled}
                style={[
                  styles.playerPill,
                  isSelected && {
                    borderColor: withAlpha(pillColor, 0.8),
                    backgroundColor: withAlpha(pillColor, 0.18),
                  },
                  disabled && styles.playerPillDisabled,
                ]}
              >
                <View
                  style={[
                    styles.playerDot,
                    { backgroundColor: disabled ? withAlpha(pillColor, 0.35) : pillColor },
                  ]}
                />
                <Text
                  style={[
                    styles.playerPillText,
                    isSelected && styles.playerPillTextSelected,
                    disabled && styles.playerPillTextDisabled,
                  ]}
                >
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeRow}
      >
        {(['dominance', 'winRate', 'prestigeMargin', 'synergy'] as ModeKey[]).map((entry) => {
          const active = entry === mode;
          return (
            <Pressable
              key={entry}
              onPress={() => setMode(entry)}
              style={({ pressed }) => [
                styles.modePill,
                active && {
                  borderColor: playerAColor,
                  backgroundColor: withAlpha(playerAColor, 0.14),
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.modePillText, active && { color: playerAColor }]}>
                {getModeLabel(entry)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {noDirectMatchup ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>No shared matchup found</Text>
          <Text style={styles.noticeText}>
            {playerAName} and {playerBName} do not have any games together in the current data.
          </Text>
        </View>
      ) : null}

      {selected ? (
        <>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            layout={Layout.springify().damping(18).stiffness(180)}
            style={[
              styles.selectedCard,
              {
                borderColor: withAlpha(playerAColor, 0.45),
                backgroundColor: withAlpha(playerAColor, 0.08),
              },
            ]}
          >
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedMatchupTitle}>
                <Text style={{ color: playerAColor }}>{playerAName}</Text>
                <Text style={styles.selectedMatchupVs}> vs </Text>
                <Text style={{ color: playerBColor }}>{selected.opponentName}</Text>
              </Text>

              <View
                style={[
                  styles.verdictChip,
                  { borderColor: withAlpha(playerAColor, 0.28) },
                ]}
              >
                <Text style={styles.verdictChipText}>{getVerdict(selected, playerAName)}</Text>
              </View>
            </View>

            <Text style={styles.summarySentence}>
              {getOverallEdgeText(selected, playerAName)}
            </Text>
            <Text style={styles.summarySentence}>
              {getSimpleMetricSentence(selected, mode, playerAName)}
            </Text>
            <Text style={styles.summarySentence}>
              {getMomentumSentence(selected, playerAName)}
            </Text>

            <View style={styles.selectedStatsGrid}>
              <View style={styles.selectedStatCard}>
                <Text style={styles.selectedStatLabel}>Games</Text>
                <Text style={styles.selectedStatValue}>{selected.gamesTogether}</Text>
              </View>
              <View style={styles.selectedStatCard}>
                <Text style={styles.selectedStatLabel}>W-L</Text>
                <Text style={styles.selectedStatValue}>
                  {selected.wins}-{selected.losses}
                </Text>
              </View>
              <View style={styles.selectedStatCard}>
                <Text style={styles.selectedStatLabel}>Prestige Δ</Text>
                <Text style={styles.selectedStatValue}>
                  {formatSigned(selected.prestigeMargin)}
                </Text>
              </View>
              <View style={styles.selectedStatCard}>
                <Text style={styles.selectedStatLabel}>Synergy Δ</Text>
                <Text style={styles.selectedStatValue}>
                  {formatSigned(selected.synergy)}
                </Text>
              </View>
              <View style={styles.selectedStatCard}>
                <Text style={styles.selectedStatLabel}>Recent Edge</Text>
                <Text style={styles.selectedStatValue}>
                  {formatSigned(selected.recentEdge)}
                </Text>
              </View>
              <View style={styles.selectedStatCard}>
                <Text style={styles.selectedStatLabel}>Momentum</Text>
                <Text style={styles.selectedStatValue}>
                  {formatSigned(selected.momentum)}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Svg width={WIDTH} height={height}>
            <Defs>
              <LinearGradient id="rivalryPanelGlow" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={withAlpha('#ffffff', 0.05)} />
                <Stop offset="100%" stopColor={withAlpha('#ffffff', 0)} />
              </LinearGradient>
            </Defs>

            <Rect
              x={0}
              y={0}
              width={WIDTH}
              height={height}
              rx={16}
              fill={chartColors.panelBg}
              stroke={chartColors.borderStrong}
            />
            <Rect
              x={1}
              y={1}
              width={WIDTH - 2}
              height={height - 2}
              rx={15}
              fill="url(#rivalryPanelGlow)"
            />

            <Line
              x1={MID_X}
              y1={PAD_TOP - 2}
              x2={MID_X}
              y2={height - PAD_BOTTOM + 2}
              stroke={chartColors.grid}
              strokeDasharray="4 4"
            />

            {chartRows.map((row, index) => {
              const y = PAD_TOP + index * ROW_H;
              const centerY = y + 18;

              return (
                <React.Fragment key={row.opponentId}>
                  <SvgText
                    x={PAD_X}
                    y={centerY - 2}
                    fill={playerBColor}
                    fontSize="12"
                    fontWeight="800"
                  >
                    {row.opponentName.length > 14
                      ? `${row.opponentName.slice(0, 13)}…`
                      : row.opponentName}
                  </SvgText>

                  <SvgText
                    x={PAD_X}
                    y={centerY + 12}
                    fill={chartColors.muted}
                    fontSize="10"
                    fontWeight="700"
                  >
                    {row.gamesTogether} games
                  </SvgText>

                  <AnimatedLadderBar
                    row={row}
                    mode={mode}
                    maxAbs={maxAbs}
                    selected
                    playerAColor={playerAColor}
                    playerBColor={playerBColor}
                    y={y}
                  />

                  <SvgText
                    x={WIDTH - PAD_X}
                    y={centerY + 4}
                    fill={chartColors.text}
                    fontSize="12"
                    fontWeight="800"
                    textAnchor="end"
                  >
                    {formatModeValue(row, mode)}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </>
      ) : null}

      <Text style={styles.axisNote}>
        {getModeDescription(mode)} · right = favorable for {playerAName} · left = favorable for {playerBName}
      </Text>
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  selectorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 10,
    backgroundColor: chartColors.panelBg,
    borderColor: chartColors.borderStrong,
  },
  selectorTitle: {
    color: chartColors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  selectorLabel: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  selectorValue: {
    color: chartColors.text,
  },
  selectorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: withAlpha(chartColors.text, 0.04),
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerPillDisabled: {
    opacity: 0.45,
  },
  playerDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  playerPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  playerPillTextSelected: {
    color: chartColors.text,
  },
  playerPillTextDisabled: {
    color: withAlpha(chartColors.subtext, 0.75),
  },
  modeRow: {
    gap: 8,
    paddingRight: 12,
    marginBottom: 10,
  },
  modePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
  },
  modePillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  noticeCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: withAlpha(chartColors.text, 0.04),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.text, 0.1),
    gap: 6,
  },
  noticeTitle: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  noticeText: {
    color: chartColors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  selectedCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  selectedMatchupTitle: {
    fontSize: 14,
    fontWeight: '900',
    flexShrink: 1,
  },
  selectedMatchupVs: {
    color: chartColors.text,
  },
  summarySentence: {
    color: chartColors.subtext,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  verdictChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: withAlpha(chartColors.text, 0.05),
    borderWidth: 1,
  },
  verdictChipText: {
    color: chartColors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  selectedStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  selectedStatCard: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 9,
    backgroundColor: withAlpha(chartColors.text, 0.035),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.text, 0.08),
    gap: 2,
  },
  selectedStatLabel: {
    color: chartColors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  selectedStatValue: {
    color: chartColors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: chartColors.panelBg,
    borderColor: chartColors.borderStrong,
  },
  emptyText: {
    color: chartColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  barHalo: {
    position: 'absolute',
    height: 20,
    borderRadius: 10,
  },
  barFill: {
    position: 'absolute',
    height: 12,
    borderRadius: 6,
  },
  barAnchorRight: {
    left: MID_X + CENTER_GAP,
  },
  barAnchorLeft: {
    right: WIDTH - (MID_X - CENTER_GAP),
  },
  axisNote: {
    color: chartColors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
