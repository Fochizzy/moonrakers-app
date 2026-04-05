import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useStore } from '@/store/useStore';
import Text from '@/components/ui/Text';
import ChartShell from '@/components/charts/ChartShell';
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
const BAR_H = 12;
const HALO_H = 20;

type Props = { playerId: string };

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
    toNumber(totals?.assistPrestigeSent) || toNumber(totals?.assistPrestigeGiven),
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

function getVerdict(row: RivalryRow): string {
  if (row.gamesTogether < 2) return 'Tiny sample';
  if (row.winRate >= 0.75) return 'Favored matchup';
  if (row.winRate <= 0.25) return 'Tough matchup';
  if (Math.abs(row.momentum) > 0.22) return row.momentum > 0 ? 'Trending up' : 'Trending down';
  if (Math.abs(row.prestigeMargin) < 0.35) return 'Usually close';
  return row.prestigeMargin > 0 ? 'Edges on points' : 'Loses on points';
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

type LadderBarProps = {
  row: RivalryRow;
  mode: ModeKey;
  maxAbs: number;
  selected: boolean;
  onPress: () => void;
  y: number;
};

function LadderBar({ row, mode, maxAbs, selected, onPress, y }: LadderBarProps) {
  const rawValue = getModeValue(row, mode);
  const positive = rawValue >= 0;
  const magnitude = Math.abs(rawValue) / Math.max(1, maxAbs);
  const width = HALF_W * magnitude;
  const fill = positive ? chartColors.green : chartColors.red;

  const barX = positive ? MID_X + CENTER_GAP : MID_X - CENTER_GAP - width;
  const haloX = barX;
  const dotX = positive ? barX + width : barX;

  return (
    <G onPress={onPress}>
      <Rect
        x={MID_X - CENTER_GAP - HALF_W}
        y={y + 4}
        width={HALF_W * 2 + CENTER_GAP * 2}
        height={28}
        rx={8}
        fill="transparent"
      />

      {width > 0 ? (
        <>
          <Rect
            x={haloX}
            y={y + 8}
            width={width}
            height={HALO_H}
            rx={10}
            fill={fill}
            opacity={selected ? 0.18 : 0.08}
          />
          <Rect
            x={barX}
            y={y + 12}
            width={width}
            height={BAR_H}
            rx={6}
            fill={fill}
            opacity={selected ? 1 : 0.84}
          />
          <Circle
            cx={dotX}
            cy={y + 18}
            r={selected ? 5 : 3.5}
            fill={row.opponentColor}
            opacity={0.95}
          />
        </>
      ) : (
        <Circle
          cx={MID_X}
          cy={y + 18}
          r={selected ? 4 : 3}
          fill={row.opponentColor}
          opacity={0.8}
        />
      )}
    </G>
  );
}

export default function RivalryGraph({ playerId }: Props) {
  const rawGames = useStore((s: any) => s.games);
  const rawPlayers = useStore((s: any) => s.players);

  const games = Array.isArray(rawGames) ? (rawGames as Game[]) : EMPTY_GAMES;
  const players = Array.isArray(rawPlayers) ? (rawPlayers as Player[]) : EMPTY_PLAYERS;

  const [mode, setMode] = useState<ModeKey>('dominance');
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);

  const me = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [playerId, players],
  );

  const data = useMemo(() => {
    const orderedGames = games
      .map((game, index) => ({ game, sortValue: getGameSortValue(game, index) }))
      .sort((a, b) => a.sortValue - b.sortValue);

    const rows: RivalryRow[] = players
      .filter((p) => p.id !== playerId)
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
          const mine = game.totals?.[playerId];
          const theirs = game.totals?.[opponent.id];
          if (!mine || !theirs) return;

          const ids = new Set((game.players ?? []).map((p) => p.id));
          if (ids.size > 0 && (!ids.has(playerId) || !ids.has(opponent.id))) return;

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
          const playerWon = winnerId === playerId;
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
  }, [games, playerId, players]);

  useEffect(() => {
    if (!data.length) {
      setSelectedOpponentId(null);
      return;
    }
    if (!data.some((row) => row.opponentId === selectedOpponentId)) {
      setSelectedOpponentId(data[0].opponentId);
    }
  }, [data, selectedOpponentId]);

  const selected =
    data.find((row) => row.opponentId === selectedOpponentId) ?? data[0] ?? null;

  const maxAbs = useMemo(() => {
    const values = data.map((row) => Math.abs(getModeValue(row, mode)));
    return Math.max(1, ...values);
  }, [data, mode]);

  const accent = me ? getPlayerColor(me.color) : chartColors.accent;
  const height = Math.max(96, PAD_TOP + PAD_BOTTOM + data.length * ROW_H);

  if (!data.length) {
    return (
      <ChartShell
        title="Rivalry Ladder"
        subtitle="How one player performs against specific opponents."
        playerColor={accent}
        badge={getModeLabel(mode)}
        explanation="Each row compares the selected player against one opponent across shared games."
        meaning="Positive values favor the selected player. Negative values favor the opponent."
      >
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No shared rivalries yet.</Text>
        </View>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title="Rivalry Ladder"
      subtitle="Head-to-head pressure, edge, and matchup texture by opponent."
      playerColor={accent}
      badge={getModeLabel(mode)}
      topStats={
        selected
          ? [
              { label: 'Opponent', value: selected.opponentName },
              { label: 'Games', value: String(selected.gamesTogether) },
              { label: 'Win Rate', value: formatPct(selected.winRate) },
              {
                label: mode === 'prestigeMargin' ? 'Prestige Δ' : getModeLabel(mode),
                value: formatModeValue(selected, mode),
              },
            ]
          : undefined
      }
      explanation="Each row compares the selected player against one opponent across games where both appeared. Direction shows who the matchup favors, while row order emphasizes the most meaningful rivalries."
      meaning={`${getModeDescription(mode)}. Right favors the selected player, left favors the opponent.`}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeRow}
      >
        {(['dominance', 'winRate', 'prestigeMargin', 'synergy'] as ModeKey[]).map((entry) => {
          const active = entry === mode;
          return (
            <Text
              key={entry}
              onPress={() => setMode(entry)}
              style={[
                styles.modePill,
                active && {
                  borderColor: accent,
                  backgroundColor: withAlpha(accent, 0.14),
                  color: accent,
                },
              ]}
            >
              {getModeLabel(entry)}
            </Text>
          );
        })}
      </ScrollView>

      {selected ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          layout={Layout.springify().damping(18).stiffness(180)}
          style={[
            styles.selectedCard,
            {
              borderColor: withAlpha(selected.opponentColor, 0.55),
              backgroundColor: withAlpha(selected.opponentColor, 0.1),
            },
          ]}
        >
          <View style={styles.selectedHeader}>
            <Text style={[styles.selectedTitle, { color: selected.opponentColor }]}>
              {selected.opponentName}
            </Text>
            <View
              style={[
                styles.verdictChip,
                { borderColor: withAlpha(selected.opponentColor, 0.34) },
              ]}
            >
              <Text style={styles.verdictChipText}>{getVerdict(selected)}</Text>
            </View>
          </View>

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
              <Text style={styles.selectedStatLabel}>Synergy</Text>
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
      ) : null}

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
          fill={chartColors.panelBg ?? chartColors.panel}
          stroke={chartColors.borderStrong ?? chartColors.border}
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

        {data.map((row, index) => {
          const y = PAD_TOP + index * ROW_H;
          const centerY = y + 18;
          const isSelected = row.opponentId === selected?.opponentId;

          return (
            <React.Fragment key={row.opponentId}>
              {index > 0 ? (
                <Line
                  x1={PAD_X}
                  y1={y - 2}
                  x2={WIDTH - PAD_X}
                  y2={y - 2}
                  stroke={withAlpha(chartColors.grid, 0.55)}
                />
              ) : null}

              <SvgText
                x={PAD_X}
                y={centerY - 2}
                fill={isSelected ? chartColors.text : chartColors.subtext}
                fontSize="12"
                fontWeight={isSelected ? '800' : '700'}
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

              <LadderBar
                row={row}
                mode={mode}
                maxAbs={maxAbs}
                selected={isSelected}
                y={y}
                onPress={() => setSelectedOpponentId(row.opponentId)}
              />

              <SvgText
                x={WIDTH - PAD_X}
                y={centerY + 4}
                fill={isSelected ? chartColors.text : chartColors.subtext}
                fontSize="12"
                fontWeight={isSelected ? '800' : '700'}
                textAnchor="end"
              >
                {formatModeValue(row, mode)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <Text style={styles.axisNote}>
        {getModeDescription(mode)} · right = favorable matchup · left = difficult matchup
      </Text>
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    gap: 8,
    paddingRight: 12,
  },
  modePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: chartColors.panelBg ?? chartColors.panel,
    borderWidth: 1,
    borderColor: chartColors.borderStrong ?? chartColors.border,
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  selectedCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 2,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '900',
    flexShrink: 1,
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
    backgroundColor: chartColors.panelBg ?? chartColors.panel,
    borderColor: chartColors.borderStrong ?? chartColors.border,
  },
  emptyText: {
    color: chartColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  axisNote: {
    color: chartColors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
});
