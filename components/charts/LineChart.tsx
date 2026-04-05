import React, { memo, useMemo } from 'react';
import MultiLineChart, {
  LineChartRound,
  LineChartSeries,
  LineMode,
} from '@/components/charts/MultiLineChart';

export type ChartDatum = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot?: Record<string, unknown>;
  [key: string]: unknown;
};

export type Player = {
  id?: string;
  name?: string;
  color?: string;
  [key: string]: unknown;
};

type CompareMode = 'all' | 'top5' | 'selectedOnly';
type EmptyBehavior = 'empty-chart' | 'hide';

type Props = {
  data?: ChartDatum[];
  players?: Player[];
  statKey?: string;
  title?: string;
  subtitle?: string;
  compare?: CompareMode;
  selectedPlayerIds?: string[];
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyBehavior?: EmptyBehavior;
  maxPlayers?: number;
  initialMode?: LineMode;
  allowedModes?: LineMode[];
};

function toTitleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDefaultTitle(statKey: string) {
  return `${toTitleCase(statKey)} Trend`;
}

function buildDefaultSubtitle(statKey: string, compare: CompareMode) {
  const statLabel = toTitleCase(statKey).toLowerCase();

  switch (compare) {
    case 'top5':
      return `Trend line for the top 5 players by ${statLabel}.`;
    case 'selectedOnly':
      return `Trend line for selected players by ${statLabel}.`;
    default:
      return `Game-by-game trend line for ${statLabel}.`;
  }
}

function sanitizeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sumPrestigeLikeRecord(record: Record<string, unknown>) {
  const totalPrestige = asNumber(record.totalPrestige);
  if (totalPrestige != null) return totalPrestige;

  const prestige = asNumber(record.prestige);
  if (prestige != null) return prestige;

  return (
    (asNumber(record.directPrestige) ?? 0) +
    (asNumber(record.assistPrestigeReceived) ?? 0) +
    (asNumber(record.objectivePrestige) ?? 0)
  );
}

function resolveStatValue(playerEntry: unknown, statKey: string): number {
  if (typeof playerEntry === 'number') {
    return statKey === 'score' || statKey === 'value' || statKey === 'totalPrestige'
      ? playerEntry
      : 0;
  }

  if (!playerEntry || typeof playerEntry !== 'object') {
    return 0;
  }

  const record = playerEntry as Record<string, unknown>;

  if (statKey === 'totalPrestige' || statKey === 'prestige') {
    return sumPrestigeLikeRecord(record);
  }

  return asNumber(record[statKey]) ?? 0;
}

function extractStatFromPoint(point: ChartDatum, playerId: string, statKey: string): number {
  const snapshot = point.snapshot;
  if (!snapshot || typeof snapshot !== 'object') return 0;
  const playerEntry = (snapshot as Record<string, unknown>)[playerId];
  return resolveStatValue(playerEntry, statKey);
}

function getPlayerSeriesTotal(data: ChartDatum[], playerId: string, statKey: string) {
  let total = 0;
  for (const point of data) {
    total += extractStatFromPoint(point, playerId, statKey);
  }
  return total;
}

function normalizePlayerId(player: Player, index: number): string | null {
  if (typeof player.id === 'string' && player.id.trim()) {
    return player.id.trim();
  }
  return null;
}

function normalizePlayerName(player: Player, index: number): string {
  if (typeof player.name === 'string' && player.name.trim()) {
    return player.name.trim();
  }
  const id = normalizePlayerId(player, index);
  if (id) return id;
  return `Player ${index + 1}`;
}

function uniquePlayers(players: Player[]) {
  const seen = new Set<string>();
  const result: Player[] = [];

  players.forEach((player, index) => {
    const id = normalizePlayerId(player, index);
    const dedupeKey = id ? `id:${id}` : `idx:${index}`;

    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    result.push(player);
  });

  return result;
}

function filterPlayers({
  players,
  data,
  statKey,
  compare,
  selectedPlayerIds,
  maxPlayers,
}: {
  players: Player[];
  data: ChartDatum[];
  statKey: string;
  compare: CompareMode;
  selectedPlayerIds: string[];
  maxPlayers: number;
}) {
  const deduped = uniquePlayers(players);

  if (compare === 'selectedOnly') {
    const selected = new Set(selectedPlayerIds);
    return deduped.filter((player, index) => {
      const id = normalizePlayerId(player, index);
      return id ? selected.has(id) : false;
    });
  }

  if (compare === 'top5') {
    return [...deduped]
      .map((player, index) => {
        const id = normalizePlayerId(player, index);
        return {
          player,
          total: id ? getPlayerSeriesTotal(data, id, statKey) : Number.NEGATIVE_INFINITY,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, Math.max(1, Math.min(maxPlayers, 5)))
      .map((entry) => entry.player);
  }

  return deduped;
}

function normalizeStatKey(statKey?: string) {
  if (typeof statKey !== 'string' || !statKey.trim()) return 'score';
  return statKey.trim();
}

function buildResolvedSubtitle({
  subtitle,
  title,
  statKey,
  compare,
  visiblePlayers,
  selectedPlayerIds,
}: {
  subtitle?: string;
  title?: string;
  statKey: string;
  compare: CompareMode;
  visiblePlayers: Player[];
  selectedPlayerIds: string[];
}) {
  if (subtitle) return subtitle;

  if (compare === 'selectedOnly' && selectedPlayerIds.length === 2) {
    const orderedPlayers = selectedPlayerIds
      .map((id) =>
        visiblePlayers.find((player, index) => normalizePlayerId(player, index) === id),
      )
      .filter(Boolean) as Player[];

    if (orderedPlayers.length === 2) {
      const trendLabel = title ?? buildDefaultTitle(statKey);
      return `${orderedPlayers[0].name ?? 'Player 1'} vs ${orderedPlayers[1].name ?? 'Player 2'} — ${trendLabel}`;
    }
  }

  return buildDefaultSubtitle(statKey, compare);
}

function buildSeries(data: ChartDatum[], players: Player[], statKey: string): LineChartSeries[] {
  return players.map((player, index) => {
    const id = normalizePlayerId(player, index) ?? `player-${index}`;
    const name = normalizePlayerName(player, index);

    return {
      id,
      name,
      color: player.color,
      values: data.map((point) => extractStatFromPoint(point, id, statKey)),
    };
  });
}

function buildRounds(data: ChartDatum[]): LineChartRound[] {
  return data.map((point, index) => ({
    round: point.round ?? point.gameIndex ?? index + 1,
    label: point.label,
  }));
}

function hasUsableSeries(series: LineChartSeries[]) {
  if (!series.length) return false;
  return series.some((entry) => entry.values.some((value) => value !== 0));
}

function LineChart({
  data,
  players,
  statKey: rawStatKey = 'score',
  title,
  subtitle,
  compare = 'all',
  selectedPlayerIds = [],
  emptyTitle = 'No chart data yet',
  emptySubtitle = 'Add games or player stats to render this trend line.',
  emptyBehavior = 'empty-chart',
  maxPlayers = 12,
  initialMode = 'raw',
  allowedModes = [
    'raw',
    'cumulativePrestige',
    'netGainPerRound',
    'rolling3RoundAverage',
    'leadMarginPerRound',
    'comebackDelta',
    'firstPlaceOccupancy',
  ],
}: Props) {
  const statKey = useMemo(() => normalizeStatKey(rawStatKey), [rawStatKey]);
  const safeData = useMemo(() => sanitizeArray(data), [data]);
  const safePlayers = useMemo(() => sanitizeArray(players), [players]);

  const visiblePlayers = useMemo(
    () =>
      filterPlayers({
        players: safePlayers,
        data: safeData,
        statKey,
        compare,
        selectedPlayerIds,
        maxPlayers,
      }),
    [safePlayers, safeData, statKey, compare, selectedPlayerIds, maxPlayers],
  );

  const resolvedTitle = useMemo(() => title ?? buildDefaultTitle(statKey), [title, statKey]);

  const resolvedSubtitle = useMemo(
    () =>
      buildResolvedSubtitle({
        subtitle,
        title: resolvedTitle,
        statKey,
        compare,
        visiblePlayers,
        selectedPlayerIds,
      }),
    [subtitle, resolvedTitle, statKey, compare, visiblePlayers, selectedPlayerIds],
  );

  const series = useMemo(
    () => buildSeries(safeData, visiblePlayers, statKey),
    [safeData, visiblePlayers, statKey],
  );

  const rounds = useMemo(() => buildRounds(safeData), [safeData]);

  const hasData = useMemo(() => hasUsableSeries(series), [series]);

  if (!hasData && emptyBehavior === 'hide') {
    return null;
  }

  return (
    <MultiLineChart
      series={hasData ? series : []}
      rounds={hasData ? rounds : []}
      title={hasData ? resolvedTitle : emptyTitle}
      subtitle={hasData ? resolvedSubtitle : emptySubtitle}
      initialMode={initialMode}
      allowedModes={allowedModes}
    />
  );
}

export default memo(LineChart);
