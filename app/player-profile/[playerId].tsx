import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Text from '@/components/ui/Text';
import StarryNight from '@/components/ui/StarryNight';
import { useStore } from '@/store/useStore';

type PlayerLike = {
  id: string;
  name: string;
  color?: string;
  elo?: number;
  rating?: number;
  wins?: number;
  gamesPlayed?: number;
  totalPrestige?: number;
  prestige?: number;
};

const COLORS = {
  bg: '#040814',
  surface: 'rgba(12, 18, 36, 0.90)',
  surfaceAlt: 'rgba(15, 23, 42, 0.95)',
  surfaceMuted: 'rgba(9, 14, 28, 0.98)',
  border: 'rgba(99, 102, 241, 0.20)',
  borderSoft: 'rgba(148, 163, 184, 0.14)',
  textPrimary: '#F8FBFF',
  textSecondary: '#C7D6F3',
  textMuted: '#8EA6C8',
  cyan: '#67E8F9',
  gold: '#FBBF24',
  success: '#22c55e',
  danger: '#ef4444',
};

function toNumber(v: unknown) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function getPlayerColor(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return '#22c55e';
    case 'purple':
      return '#a855f7';
    case 'blue':
      return '#3b82f6';
    case 'orange':
      return '#f97316';
    case 'yellow':
      return '#eab308';
    case 'red':
      return '#ef4444';
    case 'pink':
      return '#ec4899';
    default:
      return '#9ca3af';
  }
}

function getPlayerTint(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return 'rgba(34, 197, 94, 0.14)';
    case 'purple':
      return 'rgba(168, 85, 247, 0.14)';
    case 'blue':
      return 'rgba(59, 130, 246, 0.14)';
    case 'orange':
      return 'rgba(249, 115, 22, 0.14)';
    case 'yellow':
      return 'rgba(234, 179, 8, 0.14)';
    case 'red':
      return 'rgba(239, 68, 68, 0.12)';
    case 'pink':
      return 'rgba(236, 72, 153, 0.14)';
    default:
      return 'rgba(148, 163, 184, 0.12)';
  }
}

function getInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getTrendLabel(recentForm: number) {
  if (recentForm >= 2.2) return 'Strong';
  if (recentForm >= 1.5) return 'Stable';
  return 'Slipping';
}

function getExpectationLabel(delta: number) {
  if (delta >= 0.35) return 'Overperforming';
  if (delta <= -0.35) return 'Underperforming';
  return 'On expectation';
}

function getPlayerEloValue(player: any, playerLookup: Record<string, PlayerLike>) {
  const direct = toNumber(player?.elo ?? player?.rating);
  if (direct > 0) return direct;

  const id = String(player?.id ?? player?.playerId ?? '');
  if (id && playerLookup[id]) {
    return toNumber(playerLookup[id]?.elo ?? playerLookup[id]?.rating);
  }

  return 1000;
}

function derivePlayerStats(
  player: PlayerLike,
  games: any[],
  allPlayers: PlayerLike[]
) {
  const directWins = toNumber(player?.wins);
  const directGames = toNumber(player?.gamesPlayed);
  const directPrestige = toNumber(player?.totalPrestige ?? player?.prestige);
  const elo = toNumber(player?.elo ?? player?.rating);

  const playerLookup: Record<string, PlayerLike> = {};
  for (const p of allPlayers) {
    playerLookup[String(p.id)] = p;
  }

  let winsFromGames = 0;
  let gamesFromGames = 0;
  let prestigeFromGames = 0;
  let recentPoints = 0;
  let recentCount = 0;
  let placements: number[] = [];
  let recentOutcomes: boolean[] = [];

  let firstSeatGames = 0;
  let firstSeatWins = 0;
  let lastSeatGames = 0;
  let lastSeatWins = 0;

  let expectedFinishTotal = 0;
  let expectedFinishGames = 0;
  let averageOpponentEloTotal = 0;
  let averageOpponentEloGames = 0;

  const tableSizeStats: Record<number, { games: number; wins: number }> = {};
  const finishCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  const last10Placements: number[] = [];
  const last10Prestige: number[] = [];

  const turnOrderTotals: Record<
    number,
    { games: number; placementSum: number; wins: number }
  > = {};

  const matchupMap: Record<
    string,
    {
      opponentId: string;
      opponentName: string;
      games: number;
      wins: number;
      losses: number;
      ties: number;
      totalPlacementDiff: number;
    }
  > = {};

  const safeGames = Array.isArray(games) ? [...games] : [];
  safeGames.sort((a, b) => toNumber(b?.createdAt) - toNumber(a?.createdAt));

  for (const game of safeGames) {
    const gamePlayers = Array.isArray(game?.players) ? game.players : [];
    const resultIndex = gamePlayers.findIndex(
      (p: any) => p?.id === player.id || p?.playerId === player.id
    );
    if (resultIndex === -1) continue;

    const result = gamePlayers[resultIndex];
    gamesFromGames += 1;

    const prestige = toNumber(
      result?.totalPrestige ??
      result?.prestige ??
      result?.score ??
      result?.finalPrestige
    );
    prestigeFromGames += prestige;

    const placement = toNumber(result?.placement ?? result?.place ?? result?.rank);
    if (placement > 0) placements.push(placement);

    const isWinner =
      result?.isWinner === true || placement === 1 || result?.won === true;

    if (isWinner) winsFromGames += 1;
    recentOutcomes.push(isWinner);

    if (recentCount < 5) {
      recentPoints += isWinner ? 3 : prestige > 0 ? 1 : 0;
      recentCount += 1;
    }

    const tableSize = gamePlayers.length;
    if (!tableSizeStats[tableSize]) {
      tableSizeStats[tableSize] = { games: 0, wins: 0 };
    }
    tableSizeStats[tableSize].games += 1;
    if (isWinner) tableSizeStats[tableSize].wins += 1;

    if (placement >= 1 && placement <= 4) {
      finishCounts[placement] += 1;
    }

    if (last10Placements.length < 10) {
      last10Placements.push(placement);
      last10Prestige.push(prestige);
    }

    const turnOrder = toNumber(
      result?.turnOrder ??
      result?.seat ??
      ((typeof result?.seatIndex === 'number' ? result.seatIndex : resultIndex) + 1)
    );

    if (turnOrder > 0) {
      if (!turnOrderTotals[turnOrder]) {
        turnOrderTotals[turnOrder] = { games: 0, placementSum: 0, wins: 0 };
      }
      turnOrderTotals[turnOrder].games += 1;
      turnOrderTotals[turnOrder].placementSum += placement > 0 ? placement : 0;
      if (isWinner) turnOrderTotals[turnOrder].wins += 1;

      if (turnOrder === 1) {
        firstSeatGames += 1;
        if (isWinner) firstSeatWins += 1;
      }

      if (turnOrder === gamePlayers.length) {
        lastSeatGames += 1;
        if (isWinner) lastSeatWins += 1;
      }
    }

    const eloValues = gamePlayers.map((gp: any) => getPlayerEloValue(gp, playerLookup));
    const totalStrength = eloValues.reduce(
      (sum, value) => sum + Math.pow(10, value / 400),
      0
    );

    const playerEloForGame = getPlayerEloValue(result, playerLookup);
    const playerStrength = Math.pow(10, playerEloForGame / 400);
    const strengthShare =
      totalStrength > 0 ? playerStrength / totalStrength : 1 / Math.max(gamePlayers.length, 1);

    const expectedFinish =
      gamePlayers.length > 1
        ? 1 + (gamePlayers.length - 1) * (1 - strengthShare)
        : 1;

    expectedFinishTotal += expectedFinish;
    expectedFinishGames += 1;

    const opponentElos = gamePlayers
      .filter((gp: any) => String(gp?.id ?? gp?.playerId ?? '') !== String(player.id))
      .map((gp: any) => getPlayerEloValue(gp, playerLookup));

    if (opponentElos.length > 0) {
      averageOpponentEloTotal +=
        opponentElos.reduce((sum, value) => sum + value, 0) / opponentElos.length;
      averageOpponentEloGames += 1;
    }

    for (const opponent of gamePlayers) {
      const opponentId = String(opponent?.id ?? opponent?.playerId ?? '');
      if (!opponentId || opponentId === String(player.id)) continue;

      const opponentPlacement = toNumber(
        opponent?.placement ?? opponent?.place ?? opponent?.rank
      );

      if (!matchupMap[opponentId]) {
        matchupMap[opponentId] = {
          opponentId,
          opponentName: opponent?.name ?? 'Unknown',
          games: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          totalPlacementDiff: 0,
        };
      }

      matchupMap[opponentId].games += 1;

      if (placement > 0 && opponentPlacement > 0) {
        const diff = opponentPlacement - placement;
        matchupMap[opponentId].totalPlacementDiff += diff;

        if (placement < opponentPlacement) matchupMap[opponentId].wins += 1;
        else if (placement > opponentPlacement) matchupMap[opponentId].losses += 1;
        else matchupMap[opponentId].ties += 1;
      }
    }
  }

  const wins = Math.max(directWins, winsFromGames);
  const gamesPlayed = Math.max(directGames, gamesFromGames);
  const prestige = Math.max(directPrestige, prestigeFromGames);

  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
  const avgPrestige = gamesPlayed > 0 ? prestige / gamesPlayed : 0;
  const recentForm = recentCount > 0 ? recentPoints / recentCount : 0;

  const averagePlacement =
    placements.length > 0
      ? placements.reduce((sum, value) => sum + value, 0) / placements.length
      : 0;

  const top2 = placements.filter((p) => p > 0 && p <= 2).length;
  const top2Rate = gamesPlayed > 0 ? (top2 / gamesPlayed) * 100 : 0;

  const consistency =
    placements.length > 1
      ? Math.sqrt(
          placements.reduce((sum, p) => sum + Math.pow(p - averagePlacement, 2), 0) /
            placements.length
        )
      : 0;

  const clutchFactor = top2 > 0 ? (wins / top2) * 100 : 0;
  const eloPerGame = gamesPlayed > 0 ? elo / gamesPlayed : 0;
  const prestigePerWin = wins > 0 ? prestige / wins : 0;
  const finishDelta = averagePlacement > 0 ? averagePlacement - 1 : 0;

  let currentWinStreak = 0;
  for (const outcome of recentOutcomes) {
    if (outcome) currentWinStreak += 1;
    else break;
  }

  let bestWinStreak = 0;
  let runningWinStreak = 0;
  for (const outcome of [...recentOutcomes].reverse()) {
    if (outcome) {
      runningWinStreak += 1;
      if (runningWinStreak > bestWinStreak) bestWinStreak = runningWinStreak;
    } else {
      runningWinStreak = 0;
    }
  }

  const half = Math.floor(placements.length / 2);
  const firstHalf = half > 0 ? placements.slice(half) : [];
  const secondHalf = half > 0 ? placements.slice(0, half) : [];

  const firstHalfAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length
      : 0;

  const secondHalfAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length
      : 0;

  let improvementLabel = '—';
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    if (secondHalfAvg < firstHalfAvg - 0.15) improvementLabel = 'Improving';
    else if (secondHalfAvg > firstHalfAvg + 0.15) improvementLabel = 'Declining';
    else improvementLabel = 'Steady';
  }

  const turnOrderStats = Object.entries(turnOrderTotals)
    .map(([order, data]) => ({
      turnOrder: Number(order),
      games: data.games,
      averagePlacement: data.games > 0 ? data.placementSum / data.games : 0,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
    }))
    .sort((a, b) => a.turnOrder - b.turnOrder);

  const matchupStats = Object.values(matchupMap)
    .map((m) => ({
      ...m,
      averagePlacementEdge: m.games > 0 ? m.totalPlacementDiff / m.games : 0,
    }))
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games;
      return b.wins - a.wins;
    });

  const tableSizePerformance = Object.entries(tableSizeStats)
    .map(([size, data]) => ({
      size: Number(size),
      games: data.games,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
    }))
    .sort((a, b) => a.size - b.size);

  const finishDistribution = {
    first: finishCounts[1] ?? 0,
    second: finishCounts[2] ?? 0,
    third: finishCounts[3] ?? 0,
    fourth: finishCounts[4] ?? 0,
  };

  const expectedAverageFinish =
    expectedFinishGames > 0 ? expectedFinishTotal / expectedFinishGames : 0;

  const averageOpponentElo =
    averageOpponentEloGames > 0
      ? averageOpponentEloTotal / averageOpponentEloGames
      : 0;

  const expectationDelta =
    expectedAverageFinish > 0 && averagePlacement > 0
      ? expectedAverageFinish - averagePlacement
      : 0;

  return {
    elo,
    wins,
    gamesPlayed,
    prestige,
    winRate,
    avgPrestige,
    recentForm,
    averagePlacement,
    top2Rate,
    consistency,
    clutchFactor,
    currentWinStreak,
    bestWinStreak,
    eloPerGame,
    prestigePerWin,
    finishDelta,
    trendLabel: getTrendLabel(recentForm),
    improvementLabel,
    firstSeatWinRate: firstSeatGames > 0 ? (firstSeatWins / firstSeatGames) * 100 : 0,
    lastSeatWinRate: lastSeatGames > 0 ? (lastSeatWins / lastSeatGames) * 100 : 0,
    firstSeatGames,
    lastSeatGames,
    turnOrderStats,
    matchupStats,
    tableSizePerformance,
    finishDistribution,
    last10Placements,
    last10Prestige,
    expectedAverageFinish,
    expectationDelta,
    expectationLabel: getExpectationLabel(expectationDelta),
    averageOpponentElo,
  };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: `${accent}55` }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MetricCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricCellLabel}>{label}</Text>
      <Text
        style={[styles.metricCellValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'advanced' | 'matchups' | 'history'
  >('overview');

  const rawPlayerId = Array.isArray(params.playerId)
    ? params.playerId[0]
    : params.playerId;

  const playerId = typeof rawPlayerId === 'string' ? rawPlayerId : '';

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as PlayerLike[];

  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as any[];

  const player = useMemo(
    () => players.find((p) => String(p.id) === String(playerId)) ?? null,
    [players, playerId]
  );

  const stats = useMemo(() => {
    if (!player) return null;
    return derivePlayerStats(player, games, players);
  }, [player, games, players]);

  const recentGames = useMemo(() => {
    if (!player) return [];

    const safeGames = Array.isArray(games) ? [...games] : [];
    safeGames.sort((a, b) => toNumber(b?.createdAt) - toNumber(a?.createdAt));

    return safeGames
      .map((game) => {
        const gamePlayers = Array.isArray(game?.players) ? game.players : [];
        const result = gamePlayers.find(
          (p: any) => p?.id === player.id || p?.playerId === player.id
        );

        if (!result) return null;

        const prestige = toNumber(
          result?.totalPrestige ??
            result?.prestige ??
            result?.score ??
            result?.finalPrestige
        );

        const placement = toNumber(
          result?.placement ?? result?.place ?? result?.rank
        );

        const createdAt = toNumber(game?.createdAt);
        const title =
          game?.name ||
          game?.title ||
          (createdAt > 0
            ? new Date(createdAt).toLocaleDateString()
            : 'Recorded Game');

        return {
          id: String(game?.id ?? `${player.id}-${createdAt}-${placement}`),
          title,
          prestige,
          placement,
          isWinner:
            result?.isWinner === true || placement === 1 || result?.won === true,
        };
      })
      .filter(Boolean) as {
      id: string;
      title: string;
      prestige: number;
      placement: number;
      isWinner: boolean;
    }[];
  }, [games, player]);

  if (!player || !playerId || !stats) {
    return (
      <View style={styles.screen}>
        <View style={styles.backgroundLayer}>
          <StarryNight />
          <View pointerEvents="none" style={styles.backgroundDim} />
        </View>

        <View style={styles.centerWrap}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Player not found</Text>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const playerColor = getPlayerColor(player.color);
  const playerTint = getPlayerTint(player.color);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View
          pointerEvents="none"
          style={[styles.playerGlowOrb, { backgroundColor: playerTint }]}
        />
        <View pointerEvents="none" style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        <View style={[styles.heroCard, { borderColor: `${playerColor}66` }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.avatar, { backgroundColor: playerColor }]}>
              <Text style={styles.avatarText}>{getInitials(player.name)}</Text>
            </View>

            <View style={styles.heroTextWrap}>
              <Text style={styles.eyebrow}>Player Profile</Text>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={[styles.playerMeta, { color: playerColor }]}>
                {player.color?.toUpperCase() || 'UNASSIGNED'} CREW
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.statsGrid}>
            <StatCard label="ELO" value={String(stats.elo)} accent={playerColor} />
            <StatCard label="Wins" value={String(stats.wins)} accent={COLORS.gold} />
            <StatCard label="Games" value={String(stats.gamesPlayed)} accent={COLORS.cyan} />
            <StatCard label="Prestige" value={String(stats.prestige)} accent="#C4B5FD" />
            <StatCard label="Win Rate" value={formatPercent(stats.winRate)} accent={COLORS.success} />
            <StatCard label="Avg Prestige" value={stats.avgPrestige.toFixed(1)} accent={COLORS.textPrimary} />
          </View>
        </View>

        <Text style={{ color: 'red', fontSize: 22, fontWeight: '900' }}>
          REAL PROFILE SCREEN
        </Text>

        <View style={styles.tabBar}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'advanced', label: 'Advanced' },
            { key: 'matchups', label: 'Matchups' },
            { key: 'history', label: 'History' },
          ].map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={[
                  styles.tabButton,
                  selected && {
                    borderColor: playerColor,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    selected && { color: playerColor },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'overview' && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Overview</Text>
              <Text style={styles.sectionTitle}>Core Metrics</Text>

              <View style={styles.metricGrid}>
                <MetricCell label="Average placement" value={stats.averagePlacement ? stats.averagePlacement.toFixed(2) : '—'} />
                <MetricCell label="Top 2 Rate" value={formatPercent(stats.top2Rate)} />
                <MetricCell label="Consistency" value={stats.consistency.toFixed(2)} />
                <MetricCell label="Clutch Factor" value={formatPercent(stats.clutchFactor)} />
                <MetricCell label="Recent form" value={`${stats.recentForm.toFixed(1)} / 3.0`} />
                <MetricCell label="Trend" value={stats.trendLabel} />
                <MetricCell label="Improvement" value={stats.improvementLabel} />
                <MetricCell label="Current streak" value={String(stats.currentWinStreak)} />
                <MetricCell label="Best streak" value={String(stats.bestWinStreak)} />
                <MetricCell label="Finish Delta" value={stats.finishDelta.toFixed(2)} />
                <MetricCell label="ELO Per Game" value={stats.eloPerGame.toFixed(1)} />
                <MetricCell label="Prestige Per Win" value={stats.prestigePerWin.toFixed(1)} />
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Recent Form</Text>
              <Text style={styles.sectionTitle}>Last 10 Games</Text>

              <View style={styles.sparklineRow}>
                {stats.last10Placements.map((placement, index) => (
                  <View key={`${placement}-${index}`} style={styles.sparkColumn}>
                    <View
                      style={[
                        styles.sparkBar,
                        {
                          height: Math.max(8, 34 - placement * 6),
                          backgroundColor:
                            placement === 1
                              ? COLORS.gold
                              : placement === 2
                              ? COLORS.success
                              : placement === 3
                              ? COLORS.cyan
                              : COLORS.textMuted,
                        },
                      ]}
                    />
                    <Text style={styles.sparkPlacementText}>{placement || '—'}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.miniTable}>
                <View style={styles.miniRow}>
                  <Text style={styles.miniCellLeft}>Placements</Text>
                  <Text style={styles.miniCell}>
                    {stats.last10Placements.join(' • ') || '—'}
                  </Text>
                </View>

                <View style={styles.miniRow}>
                  <Text style={styles.miniCellLeft}>Prestige</Text>
                  <Text style={styles.miniCell}>
                    {stats.last10Prestige.join(' • ') || '—'}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'advanced' && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Seat Analysis</Text>
              <Text style={styles.sectionTitle}>Turn Order Impact</Text>

              <View style={styles.metricGrid}>
                <MetricCell label="Win rate going first" value={formatPercent(stats.firstSeatWinRate)} />
                <MetricCell label="Games started first" value={String(stats.firstSeatGames)} />
                <MetricCell label="Win rate going last" value={formatPercent(stats.lastSeatWinRate)} />
                <MetricCell label="Games started last" value={String(stats.lastSeatGames)} />
              </View>

              <View style={styles.miniTable}>
                {stats.turnOrderStats.length === 0 ? (
                  <Text style={styles.emptyText}>No turn-order data yet.</Text>
                ) : (
                  stats.turnOrderStats.map((row) => (
                    <View key={row.turnOrder} style={styles.miniRow}>
                      <Text style={styles.miniCellLeft}>Seat {row.turnOrder}</Text>
                      <Text style={styles.miniCell}>
                        Avg Finish {row.averagePlacement.toFixed(2)}
                      </Text>
                      <Text style={styles.miniCell}>{Math.round(row.winRate)}% WR</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Performance Context</Text>
              <Text style={styles.sectionTitle}>Table Size and Expectation</Text>

              {stats.tableSizePerformance.length > 0 && (
                <View style={styles.miniTable}>
                  {stats.tableSizePerformance.map((row) => (
                    <View key={row.size} style={styles.miniRow}>
                      <Text style={styles.miniCellLeft}>{row.size}-Player Games</Text>
                      <Text style={styles.miniCell}>
                        {Math.round(row.winRate)}% WR ({row.games})
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.metricGrid}>
                <MetricCell label="Expected finish" value={stats.expectedAverageFinish.toFixed(2)} />
                <MetricCell label="Actual finish" value={stats.averagePlacement.toFixed(2)} />
                <MetricCell
                  label="Vs expectation"
                  value={`${stats.expectationDelta >= 0 ? '+' : ''}${stats.expectationDelta.toFixed(2)}`}
                  valueColor={stats.expectationDelta >= 0 ? COLORS.success : COLORS.danger}
                />
                <MetricCell label="Expectation label" value={stats.expectationLabel} />
                <MetricCell label="Average opponent ELO" value={stats.averageOpponentElo.toFixed(0)} />
                <MetricCell label="Stored wins" value={String(toNumber(player.wins))} />
                <MetricCell label="Stored prestige" value={String(toNumber(player.totalPrestige ?? player.prestige))} />
                <MetricCell label="Player ID" value={player.id} />
              </View>
            </View>
          </>
        )}

        {activeTab === 'matchups' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Matchups</Text>
            <Text style={styles.sectionTitle}>Full Opponent Array</Text>

            {stats.matchupStats.length === 0 ? (
              <Text style={styles.emptyText}>No head-to-head data yet.</Text>
            ) : (
              <View style={styles.recentList}>
                {stats.matchupStats.map((matchup) => (
                  <View key={matchup.opponentId} style={styles.gameRow}>
                    <View style={styles.gameMain}>
                      <Text style={styles.gameTitle}>{matchup.opponentName}</Text>
                      <Text style={styles.gameMeta}>
                        {matchup.games} games • {matchup.wins}-{matchup.losses}
                        {matchup.ties > 0 ? `-${matchup.ties}` : ''}
                      </Text>
                    </View>

                    <View style={styles.gameRight}>
                      <Text
                        style={[
                          styles.gamePrestige,
                          {
                            color:
                              matchup.averagePlacementEdge >= 0
                                ? COLORS.success
                                : COLORS.danger,
                          },
                        ]}
                      >
                        {matchup.averagePlacementEdge >= 0 ? '+' : ''}
                        {matchup.averagePlacementEdge.toFixed(2)}
                      </Text>
                      <Text style={styles.gameOutcome}>Placement Edge</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Finishes</Text>
              <Text style={styles.sectionTitle}>Finish Distribution</Text>

              <View style={styles.miniTable}>
                <View style={styles.miniRow}>
                  <Text style={styles.miniCellLeft}>1st Place</Text>
                  <Text style={styles.miniCell}>{stats.finishDistribution.first}</Text>
                </View>
                <View style={styles.miniRow}>
                  <Text style={styles.miniCellLeft}>2nd Place</Text>
                  <Text style={styles.miniCell}>{stats.finishDistribution.second}</Text>
                </View>
                <View style={styles.miniRow}>
                  <Text style={styles.miniCellLeft}>3rd Place</Text>
                  <Text style={styles.miniCell}>{stats.finishDistribution.third}</Text>
                </View>
                <View style={styles.miniRow}>
                  <Text style={styles.miniCellLeft}>4th Place</Text>
                  <Text style={styles.miniCell}>{stats.finishDistribution.fourth}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Recent Games</Text>
              <Text style={styles.sectionTitle}>History Array</Text>

              {recentGames.length === 0 ? (
                <Text style={styles.emptyText}>No recorded games found.</Text>
              ) : (
                <View style={styles.recentList}>
                  {recentGames.map((game) => (
                    <View key={game.id} style={styles.gameRow}>
                      <View style={styles.gameMain}>
                        <Text style={styles.gameTitle}>{game.title}</Text>
                        <Text style={styles.gameMeta}>
                          {game.placement > 0
                            ? `Place #${game.placement}`
                            : 'Placement unavailable'}
                        </Text>
                      </View>

                      <View style={styles.gameRight}>
                        <Text
                          style={[
                            styles.gamePrestige,
                            { color: game.isWinner ? COLORS.gold : playerColor },
                          ]}
                        >
                          {game.prestige}P
                        </Text>
                        <Text
                          style={[
                            styles.gameOutcome,
                            {
                              color: game.isWinner ? COLORS.gold : COLORS.textMuted,
                            },
                          ]}
                        >
                          {game.isWinner ? 'Win' : 'Result'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  backgroundLayer: { ...StyleSheet.absoluteFillObject },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 18, 0.40)',
  },
  playerGlowOrb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    top: 70,
    right: -70,
  },
  container: {
    padding: 10,
    paddingBottom: 28,
    gap: 10,
  },
  centerWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10, 16, 30, 0.92)',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  playerName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  playerMeta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '31.5%',
    minHeight: 64,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.20)',
  },
  tabButtonText: {
    color: '#C7D6F3',
    fontSize: 12,
    fontWeight: '900',
  },
  sectionCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  sectionEyebrow: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCell: {
    width: '31%',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  metricCellLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  metricCellValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  recentList: {
    gap: 8,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  gameMain: {
    flex: 1,
    gap: 3,
  },
  gameTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  gameMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  gameRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  gamePrestige: {
    fontSize: 15,
    fontWeight: '900',
  },
  gameOutcome: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  miniTable: {
    gap: 8,
    marginTop: 2,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  miniCellLeft: {
    flex: 1.1,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  miniCell: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 4,
    minHeight: 42,
  },
  sparkColumn: {
    alignItems: 'center',
    gap: 4,
  },
  sparkBar: {
    width: 12,
    borderRadius: 999,
  },
  sparkPlacementText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
});