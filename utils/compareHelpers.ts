import buildOverallPlayerRow from '@/utils/buildOverallPlayerRow';
import { computeSeatAdvantageSpreadFromArrays } from '@/utils/seatAdvantage';

type SortDirection = 'asc' | 'desc';

type ConditionalSelectionMode = 'must' | 'may';
type ConditionalViewMode = 'present' | 'absent';

export type ConditionalState = {
  selectedPlayerIds: string[];
  anchorPlayerId: string | null;
  mustIncludeIds: string[];
  mayIncludeIds: string[];
  selectionMode: ConditionalSelectionMode;
  viewMode: ConditionalViewMode;
  sortKey: string;
  sortDirection: SortDirection;
  selectorCollapsed: boolean;
};

type ConditionalAction =
  | { type: 'toggle-player'; id: string }
  | { type: 'remove-player'; id: string }
  | { type: 'set-anchor'; id: string }
  | { type: 'clear' }
  | { type: 'apply-preset'; ids: string[]; anchorId?: string | null }
  | { type: 'set-selection-mode'; mode: ConditionalSelectionMode }
  | { type: 'set-view-mode'; mode: ConditionalViewMode }
  | { type: 'toggle-selector-collapsed' }
  | { type: 'set-sort'; key: string };

export const initialConditionalState: ConditionalState = {
  selectedPlayerIds: [],
  anchorPlayerId: null,
  mustIncludeIds: [],
  mayIncludeIds: [],
  selectionMode: 'must',
  viewMode: 'present',
  sortKey: 'winRate',
  sortDirection: 'desc',
  selectorCollapsed: false,
};

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function avg(values: number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function correlation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const xMean = avg(xs);
  const yMean = avg(ys);

  let numerator = 0;
  let xDen = 0;
  let yDen = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - xMean;
    const dy = ys[i] - yMean;
    numerator += dx * dy;
    xDen += dx * dx;
    yDen += dy * dy;
  }

  if (xDen <= 0 || yDen <= 0) return 0;
  return numerator / Math.sqrt(xDen * yDen);
}

function rgbaFromHex(hex: string, alpha: number): string {
  const safe = String(hex || '').replace('#', '').trim();
  if (safe.length !== 6) return `rgba(116,195,255,${alpha})`;

  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);

  if (![r, g, b].every(Number.isFinite)) {
    return `rgba(116,195,255,${alpha})`;
  }

  return `rgba(${r},${g},${b},${alpha})`;
}

function getEfficiencyTier(value: number): string {
  if (value >= 2) return 'Elite';
  if (value >= 1.5) return 'Strong';
  if (value >= 1) return 'Average';
  return 'Inefficient';
}

function buildPalette(color?: string) {
  const solid = color || '#74C3FF';
  return {
    solid,
    border: rgbaFromHex(solid, 0.42),
    softBg: rgbaFromHex(solid, 0.1),
    priorityBg: rgbaFromHex(solid, 0.16),
    glow: rgbaFromHex(solid, 0.22),
    strong: solid,
  };
}

function getGamePlayerEntries(game: any): any[] {
  if (Array.isArray(game?.players)) return game.players;
  if (Array.isArray(game?.playerStats)) return game.playerStats;
  if (Array.isArray(game?.standings)) return game.standings;
  if (Array.isArray(game?.results)) return game.results;
  return [];
}

function getWinnerId(game: any): string {
  return String(game?.manualWinnerId ?? game?.selectedWinnerId ?? game?.winnerId ?? '');
}

function getGroupLabel(group: any): string {
  const candidate =
    group?.name ?? group?.title ?? group?.label ?? `Group ${group?.id ?? ''}`;

  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : `Group ${group?.id ?? ''}`;
}

function getPlayerDisplayName(player: any, playerId: string): string {
  const candidate =
    player?.name ??
    player?.displayName ??
    player?.nickname ??
    player?.alias ??
    `Player ${playerId}`;

  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : `Player ${playerId}`;
}

function normalizePlayerRow(row: any, player: any, playerId: string) {
  const color = player?.color ?? row?.color ?? '#74C3FF';
  const games = n(row?.gamesPlayed ?? row?.games);
  const wins = n(row?.wins);
  const prestige = n(row?.totalPrestige ?? row?.prestige);
  const assistIn = n(row?.assistPrestigeReceived ?? row?.assistReceived);
  const assistOut = n(row?.assistPrestigeSent ?? row?.assistGiven);
  const objectiveTrackedGames = n(row?.objectiveTrackedGames);

  const avgObjectives =
    n(row?.avgObjectivesPerTrackedGame) ||
    (objectiveTrackedGames > 0
      ? n(row?.avgObjectives ?? row?.objectiveRate) / Math.max(objectiveTrackedGames, 1)
      : 0);

  const allContractsEfficiency = n(
    row?.allContractsEfficiency ?? row?.efficiency
  );
  const assistEfficiency = n(
    row?.assistEfficiency ?? row?.assistedEfficiency
  );
  const directEfficiency = n(row?.directEfficiency);

  return {
    ...row,
    id: String(row?.id ?? playerId),
    label: row?.name ?? getPlayerDisplayName(player, playerId),
    subtitle: `${games} game${games === 1 ? '' : 's'}`,
    members: 1,
    color,
    palette: buildPalette(color),

    games,
    wins,
    winRate: n(row?.winRate),

    prestige,
    totalPrestige: prestige,
    directPrestige: n(row?.directPrestige),

    assistPrestigeReceived: assistIn,
    assistPrestigeSent: assistOut,
    assists: n(row?.assists ?? row?.assistGiven),

    objectivePrestige: n(row?.objectivePrestige),
    objectiveTrackedGames,

    score: n(row?.score ?? prestige),
    failures: n(row?.failures),
    contracts: n(row?.contracts),
    objectiveWins: 0,
    closeGames: 0,
    closeGameRate: n(row?.closeGameRate),

    avgPrestigePerGame: n(row?.avgPrestige),
    avgScorePerGame: n(row?.avgScorePerGame ?? row?.avgPrestige),

    allContractsEfficiency,
    assistEfficiency,
    directEfficiency,

    // backwards-compatible aliases for components still using old field names
    efficiency: allContractsEfficiency,
    assistedEfficiency: assistEfficiency,

    efficiencyTier: String(
      row?.efficiencyTier ?? getEfficiencyTier(allContractsEfficiency)
    ),
    assistEfficiencyTier: String(
      row?.assistEfficiencyTier ?? getEfficiencyTier(assistEfficiency)
    ),
    directEfficiencyTier: String(
      row?.directEfficiencyTier ?? getEfficiencyTier(directEfficiency)
    ),

    contractFailureRatio:
      n(row?.contracts) > 0 ? n(row?.contracts) / Math.max(1, n(row?.failures)) : 0,
    avgPrestigeMargin: n(row?.avgPrestigeMargin),
    avgScoreMargin: n(row?.avgScoreMargin),
    netAssistBenefit: n(row?.netAssistValue ?? (assistIn - assistOut)),
    synergyIndex: n(row?.synergyIndex),
    avgStartOrder: n(row?.avgStartOrder),
    turnOrderWinCorrelation: n(row?.turnOrderWinCorrelation ?? row?.headToHeadEdge),
    assistWinCorrelation: n(row?.assistWinCorrelation),
    dataConfidenceScore: Math.min(1, games / 10),
    dataConfidenceLabel: games >= 8 ? 'strong' : games >= 4 ? 'medium' : 'low',
    avgObjectivesPerTrackedGame: avgObjectives,
    objectiveWinRateTracked: n(row?.objectiveWinRateTracked ?? row?.objectiveRate),
    objectiveShareOfPrestige:
      prestige > 0
        ? n(row?.objectivePrestige) / prestige
        : n(row?.objectiveShareOfPrestige),
  };
}

export const PLAYER_FIELD_SELF_ROW_ID = "__player_field_self__";
export const PLAYER_FIELD_OPPONENTS_ROW_ID = "__player_field_opponents__";

export function buildPlayerVsOpponentAggregateRows({
  playerId,
  playerMap,
  games,
}: {
  playerId: string;
  playerMap: Map<string, any>;
  games: any[];
}) {
  const normalizedPlayerId = String(playerId ?? "").trim();
  if (!normalizedPlayerId) return null;

  const player = playerMap.get(normalizedPlayerId);
  if (!player) return null;

  const sharedGames = (Array.isArray(games) ? games : []).filter((game) =>
    Boolean(buildOverallPlayerRow(normalizedPlayerId, playerMap, [game]))
  );
  if (!sharedGames.length) return null;

  const selfOverall = buildOverallPlayerRow(normalizedPlayerId, playerMap, sharedGames);
  if (!selfOverall) return null;

  const selfRowBase = normalizePlayerRow(selfOverall, player, normalizedPlayerId);
  const opponentIds = new Set<string>();

  for (const game of sharedGames) {
    for (const entry of getGamePlayerEntries(game)) {
      const entryId = String(entry?.playerId ?? entry?.id ?? "").trim();
      if (!entryId || entryId === normalizedPlayerId || !playerMap.has(entryId)) continue;
      opponentIds.add(entryId);
    }
  }

  const opponentRows = [...opponentIds]
    .map((opponentId) => {
      const overall = buildOverallPlayerRow(opponentId, playerMap, sharedGames);
      if (!overall || n(overall.gamesPlayed) <= 0) return null;
      return normalizePlayerRow(overall, playerMap.get(opponentId), opponentId);
    })
    .filter(Boolean);

  if (!opponentRows.length) return null;

  const aggregateGames = opponentRows.reduce((sum, row: any) => sum + n(row.games), 0);
  const aggregateObjectiveGames = opponentRows.reduce(
    (sum, row: any) => sum + n(row.objectiveTrackedGames),
    0
  );
  const wins = opponentRows.reduce((sum, row: any) => sum + n(row.wins), 0);
  const prestige = opponentRows.reduce((sum, row: any) => sum + n(row.prestige), 0);
  const directPrestige = opponentRows.reduce((sum, row: any) => sum + n(row.directPrestige), 0);
  const assistIn = opponentRows.reduce(
    (sum, row: any) => sum + n(row.assistPrestigeReceived),
    0
  );
  const assistOut = opponentRows.reduce(
    (sum, row: any) => sum + n(row.assistPrestigeSent),
    0
  );
  const objectivePrestige = opponentRows.reduce(
    (sum, row: any) => sum + n(row.objectivePrestige),
    0
  );
  const score = opponentRows.reduce((sum, row: any) => sum + n(row.score), 0);
  const assists = opponentRows.reduce((sum, row: any) => sum + n(row.assists), 0);
  const failures = opponentRows.reduce((sum, row: any) => sum + n(row.failures), 0);
  const contracts = opponentRows.reduce((sum, row: any) => sum + n(row.contracts), 0);
  const closeGames = opponentRows.reduce((sum, row: any) => sum + n(row.closeGames), 0);

  const weightedByGames = (key: string) => {
    if (aggregateGames <= 0) return 0;
    const total = opponentRows.reduce(
      (sum, row: any) => sum + n(row[key]) * Math.max(1, n(row.games)),
      0
    );
    return total / aggregateGames;
  };

  const weightedByObjectiveGames = (key: string) => {
    if (aggregateObjectiveGames <= 0) return 0;
    const total = opponentRows.reduce(
      (sum, row: any) => sum + n(row[key]) * Math.max(1, n(row.objectiveTrackedGames)),
      0
    );
    return total / aggregateObjectiveGames;
  };

  const avgPrestigePerGame = aggregateGames > 0 ? prestige / aggregateGames : 0;
  const avgScorePerGame = aggregateGames > 0 ? score / aggregateGames : 0;
  const efficiency = contracts + assists > 0 ? (directPrestige + assistIn) / (contracts + assists) : 0;
  const assistEfficiency = assists > 0 ? assistIn / assists : 0;
  const directEfficiency = contracts > 0 ? directPrestige / contracts : 0;
  const winRate = aggregateGames > 0 ? (wins / aggregateGames) * 100 : 0;
  const objectiveShareOfPrestige = prestige > 0 ? objectivePrestige / prestige : 0;
  const avgObjectivesPerTrackedGame =
    aggregateObjectiveGames > 0 ? objectivePrestige / aggregateObjectiveGames : 0;

  const opponentRow = {
    id: PLAYER_FIELD_OPPONENTS_ROW_ID,
    label: "Opponents (aggregate)",
    subtitle: `${sharedGames.length} shared games • ${opponentRows.length} opponents`,
    members: opponentRows.length,
    color: "#F59E0B",
    palette: buildPalette("#F59E0B"),
    games: aggregateGames,
    wins,
    winRate,
    prestige,
    totalPrestige: prestige,
    directPrestige,
    assistPrestigeReceived: assistIn,
    assistPrestigeSent: assistOut,
    assists,
    objectivePrestige,
    objectiveTrackedGames: aggregateObjectiveGames,
    score,
    failures,
    contracts,
    objectiveWins: 0,
    closeGames,
    closeGameRate: weightedByGames("closeGameRate"),
    avgPrestigePerGame,
    avgScorePerGame,
    allContractsEfficiency: efficiency,
    assistEfficiency,
    directEfficiency,
    efficiency,
    assistedEfficiency: assistEfficiency,
    efficiencyTier: getEfficiencyTier(efficiency),
    assistEfficiencyTier: getEfficiencyTier(assistEfficiency),
    directEfficiencyTier: getEfficiencyTier(directEfficiency),
    contractFailureRatio: contracts > 0 ? contracts / Math.max(1, failures) : 0,
    avgPrestigeMargin: weightedByGames("avgPrestigeMargin"),
    avgScoreMargin: weightedByGames("avgScoreMargin"),
    netAssistBenefit: assistIn - assistOut,
    synergyIndex: weightedByGames("synergyIndex"),
    avgStartOrder: weightedByGames("avgStartOrder"),
    turnOrderWinCorrelation: weightedByGames("turnOrderWinCorrelation"),
    assistWinCorrelation: weightedByGames("assistWinCorrelation"),
    dataConfidenceScore: Math.min(1, aggregateGames / 10),
    dataConfidenceLabel:
      aggregateGames >= 8 ? "strong" : aggregateGames >= 4 ? "medium" : "low",
    avgObjectivesPerTrackedGame,
    objectiveWinRateTracked: weightedByObjectiveGames("objectiveWinRateTracked"),
    objectiveShareOfPrestige,
  };

  const selfRow = {
    ...selfRowBase,
    id: PLAYER_FIELD_SELF_ROW_ID,
    subtitle: `${sharedGames.length} shared games`,
  };

  return {
    rows: [selfRow, opponentRow],
    sharedGames: sharedGames.length,
    opponentCount: opponentRows.length,
    playerLabel: selfRowBase.label,
  };
}

export function buildPlayerRows(
  selectedPlayerIds: string[],
  playerMap: Map<string, any>,
  games: any[]
) {
  return selectedPlayerIds
    .map((playerId) => {
      const player = playerMap.get(playerId);
      const overall = buildOverallPlayerRow(playerId, playerMap, games);
      if (!overall) return null;
      return normalizePlayerRow(overall, player, playerId);
    })
    .filter(Boolean);
}

export function buildGroupRows(
  selectedGroupIds: string[],
  groupMap: Map<string, any>,
  playerMap: Map<string, any>,
  games: any[]
) {
  return selectedGroupIds
    .map((groupId) => {
      const group = groupMap.get(groupId);
      if (!group) return null;

      const memberIds: string[] = Array.isArray(group?.playerIds)
        ? group.playerIds.map((id: unknown) => String(id))
        : [];

      const label = getGroupLabel(group);
      const color = '#74C3FF';
      const palette = buildPalette(color);

      if (!memberIds.length) {
        return {
          id: String(groupId),
          label,
          subtitle: '0 games',
          members: 0,
          color,
          palette,
          games: 0,
          prestige: 0,
          totalPrestige: 0,
          directPrestige: 0,
          assistPrestigeReceived: 0,
          assistPrestigeSent: 0,
          objectivePrestige: 0,
          objectiveTrackedGames: 0,
          score: 0,
          assists: 0,
          failures: 0,
          contracts: 0,
          wins: 0,
          objectiveWins: 0,
          winRate: 0,
          closeGames: 0,
          closeGameRate: 0,
          avgPrestigePerGame: 0,
          avgScorePerGame: 0,
          allContractsEfficiency: 0,
          assistEfficiency: 0,
          directEfficiency: 0,
          efficiency: 0,
          assistedEfficiency: 0,
          efficiencyTier: 'Inefficient',
          assistEfficiencyTier: 'Inefficient',
          directEfficiencyTier: 'Inefficient',
          contractFailureRatio: 0,
          avgPrestigeMargin: 0,
          avgScoreMargin: 0,
          netAssistBenefit: 0,
          synergyIndex: 0,
          avgStartOrder: 0,
          turnOrderWinCorrelation: 0,
          assistWinCorrelation: 0,
          dataConfidenceScore: 0,
          dataConfidenceLabel: 'low',
          avgObjectivesPerTrackedGame: 0,
          objectiveWinRateTracked: 0,
          objectiveShareOfPrestige: 0,
        };
      }

      let matchedGames = 0;
      let wins = 0;
      let prestige = 0;
      let directPrestige = 0;
      let assistIn = 0;
      let assistOut = 0;
      let objectivePrestige = 0;
      let objectiveTrackedGames = 0;
      let score = 0;
      let assists = 0;
      let failures = 0;
      let contracts = 0;
      let totalSynergy = 0;
      let seatSum = 0;
      let seatCount = 0;

      const seatSamples: number[] = [];
      const winSamples: number[] = [];
      const assistSamples: number[] = [];

      for (const game of games) {
        const entries = getGamePlayerEntries(game);
        if (!entries.length) continue;

        const entryIds = entries.map((entry) =>
          String(entry?.playerId ?? entry?.id ?? '')
        );

        const allPresent = memberIds.every((memberId) => entryIds.includes(memberId));
        if (!allPresent) continue;

        matchedGames += 1;

        const winnerId = getWinnerId(game);
        const didWin = memberIds.includes(winnerId);
        if (didWin) wins += 1;

        let gameAssistTotal = 0;
        let gameSeatSum = 0;
        let gameSeatCount = 0;

        for (const memberId of memberIds) {
          const playerOverall = buildOverallPlayerRow(memberId, playerMap, [game]);
          if (!playerOverall) continue;

          prestige += n(playerOverall.totalPrestige);
          directPrestige += n(playerOverall.directPrestige);
          assistIn += n(playerOverall.assistReceived);
          assistOut += n(playerOverall.assistGiven);
          objectivePrestige += n(playerOverall.objectivePrestige);
          score += n(playerOverall.score);
          assists += n(playerOverall.assistGiven);
          failures += n(playerOverall.failures);
          contracts += n(playerOverall.contracts);
          totalSynergy += n(playerOverall.synergyIndex);

          gameAssistTotal += n(playerOverall.assistGiven);

          const entry = entries.find(
            (item) => String(item?.playerId ?? item?.id ?? '') === memberId
          );
          const seat = n(entry?.startOrder ?? entry?.seat ?? entry?.turnOrder);
          if (seat > 0) {
            gameSeatSum += seat;
            gameSeatCount += 1;
            seatSum += seat;
            seatCount += 1;
          }
        }

        if (game?.objectiveStatsEligible) {
          objectiveTrackedGames += 1;
        }

        if (gameSeatCount > 0) {
          seatSamples.push(gameSeatSum / gameSeatCount);
          winSamples.push(didWin ? 1 : 0);
        }

        assistSamples.push(gameAssistTotal);
      }

      const winRate = matchedGames > 0 ? (wins / matchedGames) * 100 : 0;
      const avgPrestigePerGame = matchedGames > 0 ? prestige / matchedGames : 0;
      const avgScorePerGame = matchedGames > 0 ? score / matchedGames : 0;
      const avgObjectivesPerTrackedGame =
        objectiveTrackedGames > 0 ? objectivePrestige / objectiveTrackedGames : 0;

      const allContractsEfficiency =
        contracts + assists > 0 ? (directPrestige + assistIn) / (contracts + assists) : 0;
      const assistEfficiency = assists > 0 ? assistIn / assists : 0;
      const directEfficiency = contracts > 0 ? directPrestige / contracts : 0;

      const contractFailureRatio =
        contracts > 0 ? contracts / Math.max(1, failures) : 0;
      const synergyIndex =
        memberIds.length > 0 && matchedGames > 0
          ? totalSynergy / (matchedGames * memberIds.length)
          : 0;
      const avgStartOrder = seatCount > 0 ? seatSum / seatCount : 0;
      const turnOrderWinCorrelation = computeSeatAdvantageSpreadFromArrays(
        seatSamples,
        winSamples
      );
      const assistWinCorrelation = correlation(assistSamples, winSamples);
      const netAssistBenefit = assistIn - assistOut;
      const objectiveShareOfPrestige = prestige > 0 ? objectivePrestige / prestige : 0;

      return {
        id: String(groupId),
        label,
        subtitle: `${matchedGames} game${matchedGames === 1 ? '' : 's'} • ${memberIds.length} members`,
        members: memberIds.length,
        color,
        palette,
        games: matchedGames,
        prestige,
        totalPrestige: prestige,
        directPrestige,
        assistPrestigeReceived: assistIn,
        assistPrestigeSent: assistOut,
        objectivePrestige,
        objectiveTrackedGames,
        score,
        assists,
        failures,
        contracts,
        wins,
        objectiveWins: 0,
        winRate,
        closeGames: 0,
        closeGameRate: 0,
        avgPrestigePerGame,
        avgScorePerGame,
        allContractsEfficiency,
        assistEfficiency,
        directEfficiency,
        efficiency: allContractsEfficiency,
        assistedEfficiency: assistEfficiency,
        efficiencyTier: getEfficiencyTier(allContractsEfficiency),
        assistEfficiencyTier: getEfficiencyTier(assistEfficiency),
        directEfficiencyTier: getEfficiencyTier(directEfficiency),
        contractFailureRatio,
        avgPrestigeMargin: 0,
        avgScoreMargin: 0,
        netAssistBenefit,
        synergyIndex,
        avgStartOrder,
        turnOrderWinCorrelation,
        assistWinCorrelation,
        dataConfidenceScore: Math.min(1, matchedGames / 10),
        dataConfidenceLabel:
          matchedGames >= 8 ? 'strong' : matchedGames >= 4 ? 'medium' : 'low',
        avgObjectivesPerTrackedGame,
        objectiveWinRateTracked: objectiveTrackedGames > 0 ? winRate : 0,
        objectiveShareOfPrestige,
      };
    })
    .filter(Boolean);
}

export function sortRowsByMetric(
  rows: any[],
  metric: any,
  direction: SortDirection
) {
  if (!metric?.getValue) return [...rows];

  return [...rows].sort((a, b) => {
    const aVal = Number(metric.getValue(a));
    const bVal = Number(metric.getValue(b));

    const safeA = Number.isFinite(aVal) ? aVal : 0;
    const safeB = Number.isFinite(bVal) ? bVal : 0;

    return direction === 'desc' ? safeB - safeA : safeA - safeB;
  });
}

export function nearlyEqual(a: number, b: number, epsilon = 0.0001): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= epsilon;
}

export function getMetricBestWorst(metric: any, rows: any[]) {
  const values = (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const raw = metric?.getValue ? metric.getValue(row) : 0;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    })
    .filter((value) => value !== null) as number[];

  if (!values.length) {
    return { best: null, worst: null };
  }

  if (metric?.direction === 'neutral') {
    return { best: null, worst: null };
  }

  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  return metric?.direction === 'lower'
    ? { best: lowest, worst: highest }
    : { best: highest, worst: lowest };
}

export function formatPercent(value: number): string {
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

export function formatSigned(value: number): string {
  if (!Number.isFinite(value)) return '0.0';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

export function formatCorrelation(value: number): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(2);
}

export function buildGlobalTurnOrderInsight(games: any[]) {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const game of games) {
    const winnerId = getWinnerId(game);
    const entries = getGamePlayerEntries(game);

    for (const entry of entries) {
      const seat = n(entry?.startOrder ?? entry?.seat ?? entry?.turnOrder, 0);
      if (seat <= 0) continue;

      const playerId = String(entry?.playerId ?? entry?.id ?? '');
      xs.push(seat);
      ys.push(playerId === winnerId ? 1 : 0);
    }
  }

  const corr = correlation(xs, ys);

  return {
    correlation: corr,
    samples: xs.length,
    seatLines: [],
    summary:
      corr > 0.15
        ? 'Later seats trend better'
        : corr < -0.15
          ? 'Earlier seats trend better'
          : 'No strong seat trend',
  };
}

export function createMatrixLayout(_density: 'dense' | 'comfortable' = 'dense') {
  return {
    metricColumnWidth: 168,
    dataColumnWidth: 132,
    rowHeight: 54,
    headerHeight: 56,
    cellGap: 10,
    metricFontSize: 13,
    valueFontSize: 14,
    deltaFontSize: 11,
    headerTitleFontSize: 14,
    headerSubtitleFontSize: 11,
    cellPaddingH: 12,
    cellPaddingV: 10,
    matrixHeight: 0,
  };
}

export function getVisibleMetricEntries(
  metrics: any[],
  metricGroups: any[],
  topMetricsOnly: boolean,
  collapsedGroups: Record<string, boolean>
) {
  const entries: Array<{ type: 'group'; group: any } | { type: 'metric'; metric: any }> = [];

  for (const group of metricGroups) {
    const groupKey = String(group?.key ?? '');
    const isCollapsed = collapsedGroups[groupKey] !== false;

    if (isCollapsed) continue;

    entries.push({ type: 'group', group });

    const groupMetrics = metrics.filter((metric: any) => {
      if (String(metric?.group ?? '') !== groupKey) return false;

      if (!topMetricsOnly) return true;

      return metric?.topMetric === true || metric?.isTopMetric === true;
    });

    for (const metric of groupMetrics) {
      entries.push({ type: 'metric', metric });
    }
  }

  return entries;
}

export function getAssistCountSent(totals: any, game: any, playerId: string): number {
  const totalsAssists = n(totals?.assists);
  if (totalsAssists > 0) return totalsAssists;

  const rounds = Array.isArray(game?.rounds)
    ? game.rounds
    : Array.isArray(game?.timeline)
      ? game.timeline
      : [];

  let sent = 0;
  for (const round of rounds) {
    if (String(round?.playerId ?? '') !== playerId) continue;

    const recipients =
      round?.assistRecipients && typeof round.assistRecipients === 'object'
        ? round.assistRecipients
        : {};

    sent += Number(Object.values(recipients).reduce(
      (sum: number, value: any) => sum + n(value),
      0
    ));
  }

  return sent;
}

export function getAssistPrestigeSent(totals: any, game: any, playerId: string): number {
  const totalsSent = n(totals?.assistPrestigeSent);
  if (totalsSent > 0) return totalsSent;

  const rounds = Array.isArray(game?.rounds)
    ? game.rounds
    : Array.isArray(game?.timeline)
      ? game.timeline
      : [];

  let sent = 0;
  for (const round of rounds) {
    if (String(round?.playerId ?? '') !== playerId) continue;

    const recipients =
      round?.assistPrestigeRecipients && typeof round.assistPrestigeRecipients === 'object'
        ? round.assistPrestigeRecipients
        : {};

    sent += Number(Object.values(recipients).reduce(
      (sum: number, value: any) => sum + n(value),
      0
    ));
  }

  return sent;
}

export function getSeat(game: any, playerId: string): number {
  const players = Array.isArray(game?.players) ? game.players : [];
  const entry = players.find(
    (player: any) => String(player?.id ?? player?.playerId ?? '') === playerId
  );

  return n(entry?.startOrder ?? entry?.seat ?? entry?.turnOrder, 0);
}

export function getObjectiveCountApprox(totals: any): number {
  const explicitCount = n(totals?.objectiveCount);
  if (explicitCount > 0) return explicitCount;

  const prestigeCount = n(totals?.objectivePrestige);
  if (prestigeCount > 0) return prestigeCount;

  return 0;
}

export function conditionalReducer(
  state: ConditionalState = initialConditionalState,
  action: ConditionalAction
): ConditionalState {
  switch (action.type) {
    case 'toggle-player': {
      const id = String(action.id);
      const alreadySelected = state.selectedPlayerIds.includes(id);

      if (alreadySelected) {
        const nextSelected = state.selectedPlayerIds.filter((value) => value !== id);
        const nextMust = state.mustIncludeIds.filter((value) => value !== id);
        const nextMay = state.mayIncludeIds.filter((value) => value !== id);
        const nextAnchor =
          state.anchorPlayerId === id ? nextSelected[0] ?? null : state.anchorPlayerId;

        return {
          ...state,
          selectedPlayerIds: nextSelected,
          mustIncludeIds: nextMust,
          mayIncludeIds: nextMay,
          anchorPlayerId: nextAnchor,
        };
      }

      const nextSelected = [...state.selectedPlayerIds, id].slice(0, 5);
      if (!nextSelected.includes(id)) return state;

      const nextAnchor = state.anchorPlayerId ?? id;

      if (state.selectionMode === 'may') {
        return {
          ...state,
          selectedPlayerIds: nextSelected,
          mayIncludeIds: state.mayIncludeIds.includes(id)
            ? state.mayIncludeIds
            : [...state.mayIncludeIds, id],
          anchorPlayerId: nextAnchor,
        };
      }

      return {
        ...state,
        selectedPlayerIds: nextSelected,
        mustIncludeIds: state.mustIncludeIds.includes(id)
          ? state.mustIncludeIds
          : [...state.mustIncludeIds, id],
        anchorPlayerId: nextAnchor,
      };
    }

    case 'remove-player': {
      const id = String(action.id);
      const nextSelected = state.selectedPlayerIds.filter((value) => value !== id);
      const nextMust = state.mustIncludeIds.filter((value) => value !== id);
      const nextMay = state.mayIncludeIds.filter((value) => value !== id);
      const nextAnchor =
        state.anchorPlayerId === id ? nextSelected[0] ?? null : state.anchorPlayerId;

      return {
        ...state,
        selectedPlayerIds: nextSelected,
        mustIncludeIds: nextMust,
        mayIncludeIds: nextMay,
        anchorPlayerId: nextAnchor,
      };
    }

    case 'set-anchor': {
      const id = String(action.id);
      if (!state.selectedPlayerIds.includes(id)) {
        return {
          ...state,
          selectedPlayerIds: [...state.selectedPlayerIds, id].slice(0, 5),
          anchorPlayerId: id,
        };
      }

      return {
        ...state,
        anchorPlayerId: id,
      };
    }

    case 'clear':
      return { ...initialConditionalState };

    case 'apply-preset': {
      const ids = Array.isArray(action.ids)
        ? action.ids.map(String).filter(Boolean).slice(0, 5)
        : [];
      const anchorId =
        typeof action.anchorId === 'string' && action.anchorId
          ? action.anchorId
          : ids[0] ?? null;

      return {
        ...state,
        selectedPlayerIds: ids,
        mustIncludeIds: ids,
        mayIncludeIds: [],
        anchorPlayerId: anchorId,
      };
    }

    case 'set-selection-mode':
      return {
        ...state,
        selectionMode: action.mode,
      };

    case 'set-view-mode':
      return {
        ...state,
        viewMode: action.mode,
      };

    case 'toggle-selector-collapsed':
      return {
        ...state,
        selectorCollapsed: !state.selectorCollapsed,
      };

    case 'set-sort': {
      if (state.sortKey === action.key) {
        return {
          ...state,
          sortDirection: state.sortDirection === 'desc' ? 'asc' : 'desc',
        };
      }

      return {
        ...state,
        sortKey: action.key,
        sortDirection: 'desc',
      };
    }

    default:
      return state;
  }
}

export function buildConditionalAnalysis(
  anchorPlayerId: string | null | undefined,
  mustIncludeIds: string[] = [],
  mayIncludeIds: string[] = [],
  invertMatch: boolean,
  playerMap: Map<string, any>,
  games: any[]
) {
  const safeAnchorPlayerId =
    typeof anchorPlayerId === 'string' && anchorPlayerId ? anchorPlayerId : null;

  const safeMustIncludeIds = Array.isArray(mustIncludeIds)
    ? mustIncludeIds.map(String).filter(Boolean)
    : [];
  const safeMayIncludeIds = Array.isArray(mayIncludeIds)
    ? mayIncludeIds.map(String).filter(Boolean)
    : [];

  const requiredIds = safeAnchorPlayerId
    ? Array.from(new Set([safeAnchorPlayerId, ...safeMustIncludeIds]))
    : [...safeMustIncludeIds];

  const optionalIds = safeMayIncludeIds.filter((id) => !requiredIds.includes(id));

  if (!safeAnchorPlayerId && requiredIds.length === 0 && optionalIds.length === 0) {
    return {
      sampleSize: 0,
      matchedGames: [],
      players: [],
      summary: 'Select players to analyze conditional chemistry.',
    };
  }

  const matchedGames = (Array.isArray(games) ? games : []).filter((game) => {
    const entries = getGamePlayerEntries(game);
    const idsInGame = entries.map((entry) => String(entry?.playerId ?? entry?.id ?? ''));

    const hasRequired = requiredIds.every((id) => idsInGame.includes(id));
    const hasOptional =
      optionalIds.length === 0 || optionalIds.some((id) => idsInGame.includes(id));

    const matches = hasRequired && hasOptional;
    return invertMatch ? !matches : matches;
  });

  const players = Array.from(playerMap.values())
    .map((player) => {
      const playerId = String(player?.id ?? '');
      if (!playerId) return null;

      const overall = buildOverallPlayerRow(playerId, playerMap, matchedGames);
      if (!overall) return null;

      const normalized = normalizePlayerRow(overall, player, playerId);

      return {
        ...normalized,
        isAnchor: safeAnchorPlayerId === playerId,
        isRequired: requiredIds.includes(playerId),
        isOptional: optionalIds.includes(playerId),
      };
    })
    .filter(Boolean);

  return {
    sampleSize: matchedGames.length,
    matchedGames,
    players,
    summary:
      matchedGames.length > 0
        ? `${matchedGames.length} matching game${matchedGames.length === 1 ? '' : 's'}`
        : 'No matching games found.',
  };
}
