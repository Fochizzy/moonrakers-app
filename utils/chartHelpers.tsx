import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useStore } from '@/store/useStore';
import { useThemeContext } from '@/theme';
import StarryNight from '@/components/ui/StarryNight';

import Sparkline from '@/components/charts/Sparkline';
import ReplayChart from '@/components/charts/ReplayChart';
import RelationshipGraph from '@/components/charts/RelationshipGraph';
import RadarChart from '@/components/charts/RadarChart';
import PrestigeOverTimeChart from '@/components/charts/PrestigeOverTimeChart';
import StackedBarChart from '@/components/charts/StackedBarChart';
import LineChart from '@/components/charts/LineChart';
import Heatmap from '@/components/charts/Heatmap';
import HeadToHeadChart from '@/components/charts/HeadToHeadChart';
import EloChart from '@/components/charts/EloChart';
import EfficiencyFailureScatter from '@/components/charts/EfficiencyFailureScatter';
import BarChart from '@/components/charts/BarChart';
import AssistNetworkOverview from '@/components/charts/AssistNetworkOverview';

type Player = {
  id: string;
  name: string;
  color?: string;
};

type Round = {
  id?: string;
  playerId: string;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  assistRecipients?: Record<string, number>;
  assistPrestigeRecipients?: Record<string, number>;
  createdAt?: number;
};

type PlayerTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

type StoredGame = {
  id?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: Player[];
  rounds?: Round[];
  totals?: Record<string, PlayerTotals>;
  eloSnapshot?: Record<string, number | { elo?: number }>;
};

type Relationships = Record<string, Record<string, number>>;

type StackedRow = {
  id: string;
  label: string;
  color?: string;
  segments: Array<{
    key: string;
    label: string;
    value: number;
    color?: string;
  }>;
};

type SnapshotPoint = {
  round: number;
  snapshot: Record<string, any>;
};

type ThemeShape = ReturnType<typeof useThemeContext>['theme'];

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(totals?: PlayerTotals | null): number {
  if (!totals) return 0;

  const explicit = totals.totalPrestige ?? totals.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return toNumber(totals.directPrestige) + toNumber(totals.assistPrestigeReceived);
}

function formatTitle(key?: string | string[]) {
  const raw = Array.isArray(key) ? key[0] : key;
  if (!raw) return 'Chart';

  return raw
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getWinnerId(game?: StoredGame): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getParamList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildReplayFromGame(game: StoredGame | null): SnapshotPoint[] {
  if (!game?.rounds?.length) return [];

  const running: Record<string, any> = {};
  const replay: SnapshotPoint[] = [];

  game.rounds.forEach((round, index) => {
    const playerId = round.playerId;
    const existing = running[playerId] ?? {
      prestige: 0,
      totalPrestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      score: 0,
      assists: 0,
      failures: 0,
      contracts: 0,
    };

    const directPrestige = toNumber(round.prestige ?? round.directPrestige);
    const assistPrestigeReceived = toNumber(round.assistPrestigeReceived);
    const totalPrestige = directPrestige + assistPrestigeReceived;

    running[playerId] = {
      prestige: existing.prestige + directPrestige,
      totalPrestige: existing.totalPrestige + totalPrestige,
      directPrestige: existing.directPrestige + directPrestige,
      assistPrestigeReceived: existing.assistPrestigeReceived + assistPrestigeReceived,
      score: existing.score + totalPrestige,
      assists: existing.assists + toNumber(round.assists),
      failures: existing.failures + toNumber(round.failures),
      contracts: existing.contracts + toNumber(round.contracts),
    };

    replay.push({
      round: index + 1,
      snapshot: JSON.parse(JSON.stringify(running)),
    });
  });

  return replay;
}

function buildTimelineFromGame(game: StoredGame | null, statKey: string): SnapshotPoint[] {
  if (!game?.rounds?.length || !game.players?.length) return [];

  const running: Record<string, any> = {};
  const out: SnapshotPoint[] = [];

  game.rounds.forEach((round, index) => {
    const id = round.playerId;
    const existing = running[id] ?? {
      score: 0,
      prestige: 0,
      totalPrestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      assists: 0,
      failures: 0,
      contracts: 0,
    };

    const directPrestige = toNumber(round.prestige ?? round.directPrestige);
    const assistPrestigeReceived = toNumber(round.assistPrestigeReceived);
    const totalPrestige =
      toNumber(round.totalPrestige) || directPrestige + assistPrestigeReceived;
    const roundScore = totalPrestige;

    running[id] = {
      score: existing.score + roundScore,
      prestige: existing.prestige + directPrestige,
      totalPrestige: existing.totalPrestige + totalPrestige,
      directPrestige: existing.directPrestige + directPrestige,
      assistPrestigeReceived: existing.assistPrestigeReceived + assistPrestigeReceived,
      assists: existing.assists + toNumber(round.assists),
      failures: existing.failures + toNumber(round.failures),
      contracts: existing.contracts + toNumber(round.contracts),
      [statKey]:
        statKey === 'totalPrestige'
          ? existing.totalPrestige + totalPrestige
          : toNumber(existing[statKey]) + toNumber((round as any)[statKey]),
    };

    out.push({
      round: index + 1,
      snapshot: JSON.parse(JSON.stringify(running)),
    });
  });

  return out;
}

function buildHistoryTimeline(
  games: StoredGame[],
  players: Player[],
  statKey: string
): SnapshotPoint[] {
  if (!games.length || !players.length) return [];

  return games.map((game, index) => {
    const snapshot: Record<string, any> = {};

    players.forEach((player) => {
      const totals = game.totals?.[player.id];
      snapshot[player.id] = {
        score: toNumber(totals?.score),
        prestige: toNumber(totals?.prestige),
        totalPrestige: getTotalPrestige(totals),
        directPrestige: toNumber(totals?.directPrestige),
        assistPrestigeReceived: toNumber(totals?.assistPrestigeReceived),
        assists: toNumber(totals?.assists),
        failures: toNumber(totals?.failures),
        contracts: toNumber(totals?.contracts),
        [statKey]:
          statKey === 'totalPrestige'
            ? getTotalPrestige(totals)
            : toNumber((totals as any)?.[statKey]),
      };
    });

    return {
      round: index + 1,
      snapshot,
    };
  });
}

function buildRadarStats(totals?: PlayerTotals | null) {
  if (!totals) return {};

  const directPrestige = Math.max(0, toNumber(totals.directPrestige));
  const assistPrestige = Math.max(0, toNumber(totals.assistPrestigeReceived));
  const score = Math.max(0, toNumber(totals.score));
  const assists = Math.max(0, toNumber(totals.assists));
  const contracts = Math.max(0, toNumber(totals.contracts));
  const failures = Math.max(0, toNumber(totals.failures));
  const efficiency = Math.max(0, toNumber(totals.efficiency));
  const assistedEfficiency = Math.max(0, toNumber(totals.assistedEfficiency));

  const maxBase = Math.max(
    1,
    directPrestige,
    assistPrestige,
    score,
    assists,
    contracts,
    failures,
    efficiency,
    assistedEfficiency
  );

  return {
    directPrestige: directPrestige / maxBase,
    assistPrestige: assistPrestige / maxBase,
    score: score / maxBase,
    assists: assists / maxBase,
    contracts: contracts / maxBase,
    resilience: failures === 0 ? 1 : Math.max(0, 1 - failures / maxBase),
    efficiency: efficiency / maxBase,
    assistedEfficiency: assistedEfficiency / maxBase,
  };
}

function buildSparklineDataForPlayer(games: StoredGame[], playerId?: string) {
  if (!playerId) return [];

  return games
    .map((game) => getTotalPrestige(game.totals?.[playerId]))
    .filter((value) => Number.isFinite(value));
}

function buildStackedRowsFromGame(game: StoredGame | null): StackedRow[] {
  if (!game?.players?.length) return [];

  return game.players.map((player) => {
    const totals = game.totals?.[player.id];

    return {
      id: player.id,
      label: player.name,
      color: player.color,
      segments: [
        {
          key: 'directPrestige',
          label: 'Direct',
          value: toNumber(totals?.directPrestige),
        },
        {
          key: 'assistPrestigeReceived',
          label: 'Assist',
          value: toNumber(totals?.assistPrestigeReceived),
        },
        {
          key: 'contracts',
          label: 'Contracts',
          value: toNumber(totals?.contracts),
        },
        {
          key: 'assists',
          label: 'Assists',
          value: toNumber(totals?.assists),
        },
      ],
    };
  });
}

function buildStackedRowsFromPlayerHistory(
  games: StoredGame[],
  selectedPlayer: Player | null
): StackedRow[] {
  if (!selectedPlayer) return [];

  return games
    .filter((game) => game.totals?.[selectedPlayer.id])
    .map((game, index) => {
      const totals = game.totals?.[selectedPlayer.id];

      return {
        id: game.id ?? `game-${index}`,
        label: `Game ${index + 1}`,
        color: selectedPlayer.color,
        segments: [
          {
            key: 'directPrestige',
            label: 'Direct',
            value: toNumber(totals?.directPrestige),
          },
          {
            key: 'assistPrestigeReceived',
            label: 'Assist',
            value: toNumber(totals?.assistPrestigeReceived),
          },
          {
            key: 'contracts',
            label: 'Contracts',
            value: toNumber(totals?.contracts),
          },
          {
            key: 'assists',
            label: 'Assists',
            value: toNumber(totals?.assists),
          },
        ],
      };
    });
}

function buildBarDataFromGame(game: StoredGame | null, statKey: string) {
  if (!game?.players?.length) return [];

  return game.players.map((player) => {
    const totals = game.totals?.[player.id];
    return {
      id: player.id,
      value:
        statKey === 'totalPrestige'
          ? getTotalPrestige(totals)
          : toNumber((totals as any)?.[statKey]),
    };
  });
}

function buildBarDataFromHistory(games: StoredGame[], players: Player[], statKey: string) {
  return players.map((player) => {
    let total = 0;

    for (const game of games) {
      const totals = game.totals?.[player.id];
      total +=
        statKey === 'totalPrestige'
          ? getTotalPrestige(totals)
          : toNumber((totals as any)?.[statKey]);
    }

    return {
      id: player.id,
      value: total,
    };
  });
}

function buildPairRivalry(
  games: StoredGame[],
  playerA: Player | null,
  playerB: Player | null
) {
  if (!playerA || !playerB) return null;

  let gamesTogether = 0;
  let aWins = 0;
  let bWins = 0;
  let aPrestige = 0;
  let bPrestige = 0;

  for (const game of games) {
    const ids = new Set((game.players ?? []).map((p) => p.id));
    if (!ids.has(playerA.id) || !ids.has(playerB.id)) continue;

    gamesTogether += 1;
    aPrestige += getTotalPrestige(game.totals?.[playerA.id]);
    bPrestige += getTotalPrestige(game.totals?.[playerB.id]);

    const winnerId = getWinnerId(game);
    if (winnerId === playerA.id) aWins += 1;
    if (winnerId === playerB.id) bWins += 1;
  }

  return {
    gamesTogether,
    aWins,
    bWins,
    aPrestige,
    bPrestige,
    prestigeDiff: aPrestige - bPrestige,
  };
}

export default function ChartDetailScreen() {
  const params = useLocalSearchParams<{
    chartKey?: string | string[];
    playerId?: string | string[];
    comparePlayerId?: string | string[];
    gameId?: string | string[];
    playerIds?: string | string[];
    allPlayers?: string | string[];
  }>();

  const { theme } = useThemeContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const store = useStore() as any;

  const rawPlayers = store.players;
  const rawGames = store.games;
  const rawRelationships = store.relationships;

  const players: Player[] = Array.isArray(rawPlayers) ? rawPlayers : [];
  const games: StoredGame[] = Array.isArray(rawGames) ? rawGames : [];
  const relationships: Relationships =
    rawRelationships && typeof rawRelationships === 'object'
      ? rawRelationships
      : {};

  const chartKey = getParam(params.chartKey);
  const playerId = getParam(params.playerId);
  const comparePlayerId = getParam(params.comparePlayerId);
  const gameId = getParam(params.gameId);
  const selectedPlayerIds = getParamList(params.playerIds);
  const useAllPlayers = getParam(params.allPlayers) === '1';

  const isGlobalChart = [
    'assist-network-overview',
    'relationship-graph',
    'assist-graph',
    'elo-chart',
    'efficiency-failure-scatter',
  ].includes(String(chartKey ?? ''));

  const latestGame = games.length ? games[games.length - 1] : null;

  const selectedGame = useMemo(() => {
    if (gameId) {
      return games.find((game) => game.id === gameId) ?? null;
    }
    return latestGame;
  }, [gameId, games, latestGame]);

  const selectedPlayer = useMemo(() => {
    if (playerId) {
      return players.find((player) => player.id === playerId) ?? null;
    }

    if (selectedGame?.players?.length) {
      return selectedGame.players[0] ?? null;
    }

    return players[0] ?? null;
  }, [playerId, players, selectedGame]);

  const selectedComparePlayer = useMemo(() => {
    if (comparePlayerId) {
      return players.find((player) => player.id === comparePlayerId) ?? null;
    }

    if (selectedGame?.players?.length && selectedPlayer) {
      return selectedGame.players.find((player) => player.id !== selectedPlayer.id) ?? null;
    }

    if (players.length >= 2 && selectedPlayer) {
      return players.find((player) => player.id !== selectedPlayer.id) ?? null;
    }

    return null;
  }, [comparePlayerId, players, selectedGame, selectedPlayer]);

  const globalSelectedPlayers = useMemo(() => {
    if (!isGlobalChart) return [];
    if (useAllPlayers || selectedPlayerIds.length === 0) return players;

    return selectedPlayerIds
      .map((id) => players.find((player) => player.id === id) ?? null)
      .filter((player): player is Player => Boolean(player));
  }, [isGlobalChart, players, selectedPlayerIds, useAllPlayers]);

  const selectedPlayers = useMemo(() => {
    if (isGlobalChart) return globalSelectedPlayers;
    if (selectedGame?.players?.length) return selectedGame.players;
    if (selectedPlayer && selectedComparePlayer) return [selectedPlayer, selectedComparePlayer];
    if (selectedPlayer) return [selectedPlayer];
    return players;
  }, [
    globalSelectedPlayers,
    isGlobalChart,
    players,
    selectedComparePlayer,
    selectedGame,
    selectedPlayer,
  ]);

  const selectedPlayerTotals = useMemo(() => {
    if (!selectedPlayer) return null;

    if (selectedGame?.totals?.[selectedPlayer.id]) {
      return selectedGame.totals[selectedPlayer.id];
    }

    let aggregate: PlayerTotals = {
      directPrestige: 0,
      assistPrestigeReceived: 0,
      score: 0,
      assists: 0,
      failures: 0,
      contracts: 0,
      efficiency: 0,
      assistedEfficiency: 0,
    };

    for (const game of games) {
      const totals = game.totals?.[selectedPlayer.id];
      if (!totals) continue;

      aggregate = {
        directPrestige:
          toNumber(aggregate.directPrestige) + toNumber(totals.directPrestige),
        assistPrestigeReceived:
          toNumber(aggregate.assistPrestigeReceived) +
          toNumber(totals.assistPrestigeReceived),
        score: toNumber(aggregate.score) + toNumber(totals.score),
        assists: toNumber(aggregate.assists) + toNumber(totals.assists),
        failures: toNumber(aggregate.failures) + toNumber(totals.failures),
        contracts: toNumber(aggregate.contracts) + toNumber(totals.contracts),
        efficiency: toNumber(aggregate.efficiency) + toNumber(totals.efficiency),
        assistedEfficiency:
          toNumber(aggregate.assistedEfficiency) + toNumber(totals.assistedEfficiency),
      };
    }

    return {
      ...aggregate,
      totalPrestige:
        toNumber(aggregate.directPrestige) + toNumber(aggregate.assistPrestigeReceived),
    };
  }, [games, selectedGame, selectedPlayer]);

  const replayData = useMemo(() => buildReplayFromGame(selectedGame), [selectedGame]);

  const prestigeTimelineData = useMemo(
    () =>
      selectedGame
        ? buildTimelineFromGame(selectedGame, 'totalPrestige')
        : buildHistoryTimeline(games, selectedPlayers, 'totalPrestige'),
    [games, selectedGame, selectedPlayers]
  );

  const lineChartData = useMemo(
    () =>
      selectedGame
        ? buildTimelineFromGame(selectedGame, 'score')
        : buildHistoryTimeline(games, selectedPlayers, 'score'),
    [games, selectedGame, selectedPlayers]
  );

  const heatmapData = useMemo(
    () =>
      selectedGame
        ? buildTimelineFromGame(selectedGame, 'totalPrestige')
        : buildHistoryTimeline(games, selectedPlayers, 'totalPrestige'),
    [games, selectedGame, selectedPlayers]
  );

  const sparklineData = useMemo(
    () => buildSparklineDataForPlayer(games, selectedPlayer?.id),
    [games, selectedPlayer]
  );

  const radarStats = useMemo(() => buildRadarStats(selectedPlayerTotals), [selectedPlayerTotals]);

  const stackedRows = useMemo(() => {
    if (selectedGame) {
      return buildStackedRowsFromGame(selectedGame);
    }

    return buildStackedRowsFromPlayerHistory(games, selectedPlayer);
  }, [games, selectedGame, selectedPlayer]);

  const barData = useMemo(() => {
    return selectedGame
      ? buildBarDataFromGame(selectedGame, 'score')
      : buildBarDataFromHistory(games, selectedPlayers, 'score');
  }, [games, selectedGame, selectedPlayers]);

  const pairPlayers = useMemo(() => {
    if (selectedPlayer && selectedComparePlayer) {
      return [selectedPlayer, selectedComparePlayer];
    }
    return [];
  }, [selectedComparePlayer, selectedPlayer]);

  const pairRivalry = useMemo(
    () => buildPairRivalry(games, selectedPlayer, selectedComparePlayer),
    [games, selectedComparePlayer, selectedPlayer]
  );

  const renderChart = () => {
    switch (chartKey) {
      case 'sparkline':
        return selectedPlayer ? (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Sparkline</Text>
            <Text style={styles.metaText}>
              Recent prestige trend for {selectedPlayer.name}.
            </Text>
            <View style={styles.centered}>
              <Sparkline
                data={sparklineData}
                width={280}
                height={56}
                color={theme.colors.accent.primary}
                strokeWidth={3}
              />
            </View>
          </View>
        ) : (
          <EmptyState text="No player data available yet." styles={styles} />
        );

      case 'replay-chart':
        return selectedGame ? (
          <ReplayChart
            replay={replayData}
            players={selectedGame.players ?? []}
            statKey="totalPrestige"
            title="Replay Chart"
          />
        ) : (
          <EmptyState text="No saved game available yet." styles={styles} />
        );

      case 'relationship-graph':
      case 'assist-graph':
        return (
          <RelationshipGraph
            players={selectedPlayers}
            relationships={relationships}
          />
        );

      case 'assist-network-overview':
        return (
          <AssistNetworkOverview
            players={selectedPlayers}
            relationships={relationships}
          />
        );

      case 'radar-chart':
        return selectedPlayer ? (
          <RadarChart
            stats={radarStats}
            title={`${selectedPlayer.name} Archetype`}
          />
        ) : (
          <EmptyState text="No player available yet." styles={styles} />
        );

      case 'prestige-over-time':
        return (
          <PrestigeOverTimeChart
            data={prestigeTimelineData}
            players={selectedPlayers}
            title="Prestige Over Time"
            subtitle={
              selectedGame
                ? 'Total prestige progression across recorded rounds.'
                : 'Total prestige across saved games.'
            }
          />
        );

      case 'stacked-bar-chart':
        return stackedRows.length ? (
          <StackedBarChart
            data={stackedRows}
            players={selectedPlayers}
            title="Stacked Bar Chart"
            subtitle={
              selectedGame
                ? 'Breakdown of selected game totals by player.'
                : 'Breakdown of selected player totals across games.'
            }
            emptyText="No stacked chart data available."
          />
        ) : (
          <EmptyState text="No stacked chart data available yet." styles={styles} />
        );

      case 'line-chart':
        return (
          <LineChart
            data={lineChartData}
            players={selectedPlayers}
            statKey="score"
          />
        );

      case 'heatmap':
        return (
          <Heatmap
            data={heatmapData}
            players={selectedPlayers}
            statKey="totalPrestige"
            title="Heatmap"
            subtitle={
              selectedGame
                ? 'Round-by-round prestige intensity.'
                : 'Game-by-game prestige intensity.'
            }
          />
        );

      case 'head-to-head-chart':
        return pairPlayers.length === 2 ? (
          <HeadToHeadChart players={pairPlayers} games={games} />
        ) : (
          <EmptyState text="Need at least two players for head-to-head." styles={styles} />
        );

      case 'elo-chart':
        return <EloChart games={games} players={selectedPlayers} />;

      case 'efficiency-failure-scatter':
        return <EfficiencyFailureScatter games={games} players={selectedPlayers} />;

      case 'bar-chart':
        return (
          <BarChart
            data={barData}
            players={selectedPlayers}
            title={selectedGame ? 'Game Score Bar Chart' : 'Score Bar Chart'}
            emptyText="No bar chart data available."
          />
        );

      case 'rivalry-graph':
        return pairPlayers.length === 2 && pairRivalry ? (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>
              {selectedPlayer?.name} vs {selectedComparePlayer?.name}
            </Text>
            <Text style={styles.metaText}>
              Games Together: {pairRivalry.gamesTogether}
            </Text>
            <Text style={styles.metaText}>
              Wins: {pairRivalry.aWins} - {pairRivalry.bWins}
            </Text>
            <Text style={styles.metaText}>
              Total Prestige: {pairRivalry.aPrestige} - {pairRivalry.bPrestige}
            </Text>
            <Text style={styles.metaText}>
              Prestige Differential: {pairRivalry.prestigeDiff}
            </Text>
          </View>
        ) : (
          <EmptyState text="Need two players for rivalry view." styles={styles} />
        );

      default:
        return (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{formatTitle(chartKey)}</Text>
            <Text style={styles.metaText}>
              Chart key not found: {String(chartKey ?? 'undefined')}
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.screen}>
      <StarryNight />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{formatTitle(chartKey)}</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Current Selection</Text
