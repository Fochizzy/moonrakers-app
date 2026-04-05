import { StoredGame } from '@/utils/compareTypes';

type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
  legacyIds?: string[];
  nameAliases?: string[];
  [key: string]: unknown;
};

type PlayerMap = Map<string, PlayerLike>;

type GamePlayerStats = {
  id?: string;
  playerId?: string;
  legacyIds?: string[];
  name?: string;
  playerName?: string;
  nameAliases?: string[];
  prestige?: number;
  totalPrestige?: number;
  finalPrestige?: number;
  score?: number;
  directPrestige?: number;
  selfPrestige?: number;
  prestigeFromSelf?: number;
  assistGiven?: number;
  assistsGiven?: number;
  assistPrestigeGiven?: number;
  assistSent?: number;
  assistOut?: number;
  assistReceived?: number;
  assistsReceived?: number;
  assistPrestigeReceived?: number;
  assistIn?: number;
  objectivesCompleted?: number;
  objectives?: number;
  objectiveCount?: number;
  objectivePrestige?: number;
  turns?: number;
  turnCount?: number;
  missionsSucceeded?: number;
  contractSuccesses?: number;
  successfulContracts?: number;
  contracts?: number;
  successes?: number;
  missionsFailed?: number;
  contractFailures?: number;
  failedContracts?: number;
  failures?: number;
  stayedAtBase?: number;
  stayAtBase?: number;
  baseStays?: number;
  won?: boolean;
  isWinner?: boolean;
  winner?: boolean;
  placement?: number;
  place?: number;
  rank?: number;
  eloBefore?: number;
  eloAfter?: number;
  eloDelta?: number;
  startOrder?: number;
  seat?: number;
  turnOrder?: number;
  [key: string]: unknown;
};

export type OverallPlayerRow = {
  id: string;
  name: string;
  color?: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  prestige: number;
  totalPrestige: number;
  avgPrestige: number;
  avgPrestigePerGame: number;
  avgPrestigePerTurn: number;
  directPrestige: number;
  assistGiven: number;
  assistReceived: number;
  netAssistValue: number;
  netAssistBenefit: number;
  objectiveRate: number;
  avgObjectives: number;
  avgObjectivesPerTrackedGame: number;
  objectivePrestige: number;
  objectiveShareOfPrestige: number;
  score: number;
  avgScorePerGame: number;
  contracts: number;
  failures: number;
  contractSuccessRate: number;
  contractFailureRate: number;
  contractFailureRatio: number;
  efficiency: number;
  assistEfficiency: number;
  assistedEfficiency: number;
  directEfficiency: number;
  avgTurns: number;
  stayAtBaseRate: number;
  comebackWins: number;
  bestPrestige: number;
  worstPrestige: number;
  synergyIndex: number;
  groupSynergyScore: number;
  placement1: number;
  placement2: number;
  placement3: number;
  placement4: number;
  prestigeStdDev: number;
  recentForm: string;
  lastFiveResults: string[];
  eloDelta: number;
  eloChange: number;
  eloTrend: number;
  avgStartSeat: number;
  avgStartOrder: number;
  seatOrderWinRate: string;
  turnOrderWinRate: string;
  turnOrderWinCorrelation: number;
  headToHeadEdge: number;
  winRateByPlayerCount: string;
  sharedGameRate: string;
  sharedGameWinRate: string;
};

type PlacementCounts = {
  placement1: number;
  placement2: number;
  placement3: number;
  placement4: number;
};

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = avg(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
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

function normalizeName(value?: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeLooseName(value?: string): string {
  return normalizeName(value).replace(/[^a-z0-9 ]+/g, '');
}

function normalizeId(value: unknown): string {
  return String(value ?? '').trim();
}

function getAliasIdsFromPlayer(player?: PlayerLike): string[] {
  const aliases = Array.isArray(player?.legacyIds) ? player!.legacyIds : [];
  return aliases.map(normalizeId).filter(Boolean);
}

function getAliasNamesFromPlayer(player?: PlayerLike): string[] {
  const aliases = Array.isArray(player?.nameAliases) ? player!.nameAliases : [];
  return aliases.map((value) => String(value ?? '')).filter(Boolean);
}

function getGamePlayerEntries(game: StoredGame): GamePlayerStats[] {
  if (Array.isArray((game as any).players)) return (game as any).players;
  if (Array.isArray((game as any).playerStats)) return (game as any).playerStats;
  if (Array.isArray((game as any).standings)) return (game as any).standings;
  if (Array.isArray((game as any).results)) return (game as any).results;
  return [];
}

function getPlayerId(entry: GamePlayerStats): string {
  return String(entry.playerId ?? entry.id ?? '');
}

function getLegacyIds(entry: GamePlayerStats): string[] {
  const entryIds = Array.isArray(entry.legacyIds) ? entry.legacyIds : [];
  return entryIds.map(normalizeId).filter(Boolean);
}

function getPlayerName(entry: GamePlayerStats): string {
  return String(entry.playerName ?? entry.name ?? '');
}

function getEntryNameAliases(entry: GamePlayerStats): string[] {
  const aliases = Array.isArray(entry.nameAliases) ? entry.nameAliases : [];
  return aliases.map((value) => String(value ?? '')).filter(Boolean);
}

function nameVariants(value?: string): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const a = normalizeName(raw);
  const b = normalizeLooseName(raw);
  return Array.from(new Set([a, b].filter(Boolean)));
}

function matchesPlayer(
  entry: GamePlayerStats,
  playerId: string,
  playerName?: string,
  aliasIds: string[] = [],
  aliasNames: string[] = []
): boolean {
  const entryId = normalizeId(getPlayerId(entry));
  const targetId = normalizeId(playerId);
  const entryLegacyIds = getLegacyIds(entry);
  const allTargetIds = new Set([targetId, ...aliasIds.map(normalizeId)].filter(Boolean));

  if (entryId && allTargetIds.has(entryId)) return true;
  if (entryLegacyIds.some((legacyId) => allTargetIds.has(legacyId))) return true;

  const targetNames = new Set<string>();
  for (const value of [playerName, ...aliasNames]) {
    for (const variant of nameVariants(value)) targetNames.add(variant);
  }

  const entryNames = new Set<string>();
  for (const value of [getPlayerName(entry), ...getEntryNameAliases(entry)]) {
    for (const variant of nameVariants(value)) entryNames.add(variant);
  }

  if (!targetNames.size || !entryNames.size) return false;

  for (const entryName of entryNames) {
    for (const targetName of targetNames) {
      if (!entryName || !targetName) continue;
      if (entryName === targetName) return true;
      if (entryName.includes(targetName)) return true;
      if (targetName.includes(entryName)) return true;
    }
  }

  return false;
}

function getGameTotals(game: StoredGame, playerId: string, aliasIds: string[] = []): any {
  const totals = (game as any)?.totals;
  if (!totals || typeof totals !== 'object') return null;

  const idsToTry = [playerId, ...aliasIds].map(normalizeId).filter(Boolean);
  for (const id of idsToTry) {
    if ((totals as any)[id]) return (totals as any)[id];
  }

  return null;
}

function getWinnerId(game: StoredGame): string {
  return String((game as any)?.manualWinnerId ?? (game as any)?.selectedWinnerId ?? (game as any)?.winnerId ?? '');
}

function getPrestige(entry: GamePlayerStats, totals?: any): number {
  return (
    n(entry.totalPrestige) ||
    n(entry.finalPrestige) ||
    n(entry.prestige) ||
    n(totals?.totalPrestige) ||
    n(totals?.prestige) ||
    (getDirectPrestige(entry, totals) + getAssistReceived(entry, totals) + n(entry.objectivePrestige) + n(totals?.objectivePrestige))
  );
}

function getScore(entry: GamePlayerStats, totals?: any): number {
  return n(entry.score) || n(totals?.score) || getPrestige(entry, totals);
}

function getObjectivePrestige(entry: GamePlayerStats, totals?: any): number {
  return n(entry.objectivePrestige) || n(totals?.objectivePrestige);
}

function getDirectPrestige(entry: GamePlayerStats, totals?: any): number {
  return n(entry.directPrestige) || n(entry.selfPrestige) || n(entry.prestigeFromSelf) || n(totals?.directPrestige) || n(totals?.selfPrestige) || n(totals?.prestigeFromSelf);
}

function getAssistGiven(entry: GamePlayerStats, totals?: any): number {
  return n(entry.assistsGiven) || n(entry.assistGiven) || n(totals?.assistsGiven) || n(totals?.assists) || 0;
}

function getAssistReceived(entry: GamePlayerStats, totals?: any): number {
  return n(entry.assistReceived) || n(entry.assistsReceived) || n(entry.assistPrestigeReceived) || n(entry.assistIn) || n(totals?.assistReceived) || n(totals?.assistsReceived) || n(totals?.assistPrestigeReceived);
}

function getObjectives(entry: GamePlayerStats, totals?: any): number {
  return n(entry.objectivesCompleted) || n(entry.objectives) || n(entry.objectiveCount) || n(totals?.objectivesCompleted) || n(totals?.objectives) || n(totals?.objectiveCount) || Math.floor(n(totals?.objectivePrestige));
}

function getTurns(entry: GamePlayerStats, game: StoredGame, totals?: any): number {
  return n(entry.turns) || n(entry.turnCount) || n(totals?.turns) || n(totals?.turnCount) || n((game as any).turnCount) || (Array.isArray((game as any).rounds) ? (game as any).rounds.length : 0);
}

function getContractSuccesses(entry: GamePlayerStats, totals?: any): number {
  return n(entry.missionsSucceeded) || n(entry.contractSuccesses) || n(entry.successfulContracts) || n(entry.contracts) || n(entry.successes) || n(totals?.missionsSucceeded) || n(totals?.contractSuccesses) || n(totals?.successfulContracts) || n(totals?.contracts) || n(totals?.successes);
}

function getContractFailures(entry: GamePlayerStats, totals?: any): number {
  return n(entry.missionsFailed) || n(entry.contractFailures) || n(entry.failedContracts) || n(entry.failures) || n(totals?.missionsFailed) || n(totals?.contractFailures) || n(totals?.failedContracts) || n(totals?.failures);
}

function getStayedAtBase(entry: GamePlayerStats, totals?: any): number {
  return n(entry.stayedAtBase) || n(entry.stayAtBase) || n(entry.baseStays) || n(totals?.stayedAtBase) || n(totals?.stayAtBase) || n(totals?.baseStays);
}

function getPlacement(entry: GamePlayerStats, totals?: any): number {
  return n(entry.placement) || n(entry.place) || n(entry.rank) || n(totals?.placement) || n(totals?.place) || n(totals?.rank);
}

function getSeat(entry: GamePlayerStats, game: StoredGame, totals?: any): number {
  return n(entry.startOrder) || n(entry.seat) || n(entry.turnOrder) || n(totals?.startOrder) || n(totals?.seat) || n((game as any)?.startOrder?.[getPlayerId(entry)]) || 0;
}

function getEloDelta(entry: GamePlayerStats, totals?: any): number {
  if (Number.isFinite(Number(entry.eloDelta))) return n(entry.eloDelta);
  if (Number.isFinite(Number(totals?.eloDelta))) return n(totals?.eloDelta);
  const before = Number.isFinite(Number(entry.eloBefore)) ? n(entry.eloBefore) : Number.isFinite(Number(totals?.eloBefore)) ? n(totals?.eloBefore) : null;
  const after = Number.isFinite(Number(entry.eloAfter)) ? n(entry.eloAfter) : Number.isFinite(Number(totals?.eloAfter)) ? n(totals?.eloAfter) : null;
  if (before !== null && after !== null) return after - before;
  return 0;
}

function getCreatedAt(game: StoredGame): number {
  return n((game as any)?.createdAt ?? (game as any)?.date ?? (game as any)?.playedAt);
}

function inferWinner(entry: GamePlayerStats, game: StoredGame, playerId: string, totals?: any, aliasIds: string[] = []): boolean {
  if (entry.won === true || entry.isWinner === true || entry.winner === true) return true;
  if (totals?.won === true || totals?.isWinner === true || totals?.winner === true) return true;
  const winnerId = normalizeId(getWinnerId(game));
  const validIds = new Set([normalizeId(playerId), ...aliasIds.map(normalizeId)].filter(Boolean));
  if (winnerId && validIds.has(winnerId)) return true;
  return getPlacement(entry, totals) === 1;
}

function buildRecentFormString(results: string[]): string {
  return results.length ? results.join('') : '—';
}

function ratioString(numerator: number, denominator: number): string {
  return denominator ? `${round(pct(numerator, denominator), 1).toFixed(1)}%` : '—';
}

export default function buildOverallPlayerRow(
  playerId: string,
  playerMap: PlayerMap,
  games: StoredGame[]
): OverallPlayerRow | null {
  const player = playerMap.get(playerId);
  if (!player) return null;

  const playerName = String(player.name ?? 'Unknown');
  const aliasIds = getAliasIdsFromPlayer(player);
  const aliasNames = getAliasNamesFromPlayer(player);

  let gamesPlayed = 0;
  let wins = 0;
  let totalPrestige = 0;
  let totalScore = 0;
  let totalDirectPrestige = 0;
  let totalAssistGiven = 0;
  let totalAssistReceived = 0;
  let totalObjectives = 0;
  let totalObjectivePrestige = 0;
  let objectiveTrackedGames = 0;
  let totalTurns = 0;
  let totalSuccesses = 0;
  let totalFailures = 0;
  let totalStayAtBase = 0;
  let totalEloDelta = 0;

  const prestigeHistory: number[] = [];
  const lastFiveResults: string[] = [];
  const seatSamples: number[] = [];
  const seatWinSamples: number[] = [];
  const playerCountSizes: number[] = [];
  const playerCountWinSamples: number[] = [];
  const placementCounts: PlacementCounts = { placement1: 0, placement2: 0, placement3: 0, placement4: 0 };

  const safeGames = Array.isArray(games) ? [...games] : [];
  safeGames.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

  for (const game of safeGames) {
    const entries = getGamePlayerEntries(game);
    const entry = entries.find((e) => matchesPlayer(e, playerId, playerName, aliasIds, aliasNames));
    const totals = getGameTotals(game, playerId, aliasIds);
    if (!entry && !totals) continue;

    const fallbackEntry = (entry ?? {}) as GamePlayerStats;
    const prestige = getPrestige(fallbackEntry, totals);
    const score = getScore(fallbackEntry, totals);
    const directPrestige = getDirectPrestige(fallbackEntry, totals);
    const assistGiven = getAssistGiven(fallbackEntry, totals);
    const assistReceived = getAssistReceived(fallbackEntry, totals);
    const objectives = getObjectives(fallbackEntry, totals);
    const objectivePrestige = getObjectivePrestige(fallbackEntry, totals);
    const turns = getTurns(fallbackEntry, game, totals);
    const successes = getContractSuccesses(fallbackEntry, totals);
    const failures = getContractFailures(fallbackEntry, totals);
    const stayedAtBase = getStayedAtBase(fallbackEntry, totals);
    const placement = getPlacement(fallbackEntry, totals);
    const seat = getSeat(fallbackEntry, game, totals);
    const eloDelta = getEloDelta(fallbackEntry, totals);
    const didWin = inferWinner(fallbackEntry, game, playerId, totals, aliasIds);

    gamesPlayed += 1;
    if (didWin) wins += 1;
    totalPrestige += prestige;
    totalScore += score;
    totalDirectPrestige += directPrestige;
    totalAssistGiven += assistGiven;
    totalAssistReceived += assistReceived;
    totalObjectives += objectives;
    totalObjectivePrestige += objectivePrestige;
    totalTurns += turns;
    totalSuccesses += successes;
    totalFailures += failures;
    totalStayAtBase += stayedAtBase;
    totalEloDelta += eloDelta;

    prestigeHistory.push(prestige);
    lastFiveResults.unshift(didWin ? 'W' : 'L');
    if (lastFiveResults.length > 5) lastFiveResults.pop();

    if ((game as any)?.objectiveStatsEligible || objectives > 0 || objectivePrestige > 0) {
      objectiveTrackedGames += 1;
    }

    if (placement >= 1 && placement <= 4) {
      const key = `placement${placement}` as keyof PlacementCounts;
      placementCounts[key] += 1;
    }

    if (seat > 0) {
      seatSamples.push(seat);
      seatWinSamples.push(didWin ? 1 : 0);
    }

    const playerCount = Array.isArray((game as any)?.players) ? (game as any).players.length : 0;
    if (playerCount > 0) {
      playerCountSizes.push(playerCount);
      playerCountWinSamples.push(didWin ? 1 : 0);
    }
  }

  const winRate = pct(wins, gamesPlayed);
  const avgPrestigeValue = avg(prestigeHistory);
  const avgTurns = gamesPlayed ? totalTurns / gamesPlayed : 0;
  const avgPrestigePerTurn = totalTurns > 0 ? totalPrestige / totalTurns : 0;
  const avgScorePerGame = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;
  const avgPrestigePerGame = gamesPlayed > 0 ? totalPrestige / gamesPlayed : 0;

  const objectiveRate = objectiveTrackedGames > 0 ? pct(totalObjectives, objectiveTrackedGames) : 0;
  const avgObjectives = objectiveTrackedGames > 0 ? totalObjectives / objectiveTrackedGames : 0;
  const objectiveShareOfPrestige = totalPrestige > 0 ? totalObjectivePrestige / totalPrestige : 0;

  const contractSuccessRate = pct(totalSuccesses, totalSuccesses + totalFailures);
  const contractFailureRate = pct(totalFailures, totalSuccesses + totalFailures);
  const contractFailureRatio = totalSuccesses + totalFailures > 0 ? totalFailures / (totalSuccesses + totalFailures) : 0;

  const allEffDenominator = totalSuccesses + totalAssistGiven;
  const allEfficiency = allEffDenominator > 0 ? totalPrestige / allEffDenominator : 0;
  const assistEfficiency = totalAssistGiven > 0 ? totalAssistReceived / totalAssistGiven : 0;
  const directEfficiency = totalSuccesses > 0 ? totalDirectPrestige / totalSuccesses : 0;
  const stayAtBaseRate = pct(totalStayAtBase, gamesPlayed);

  const rawAssistNet = totalAssistReceived - totalAssistGiven;
  const assistImpact = rawAssistNet * 0.6 + (wins > 0 ? (wins / Math.max(gamesPlayed, 1)) * totalAssistReceived * 0.4 : 0);
  const netAssistValue = round(assistImpact, 2);

  const prestigeStdDev = stdDev(prestigeHistory);
  const bestPrestige = prestigeHistory.length ? Math.max(...prestigeHistory) : 0;
  const worstPrestige = prestigeHistory.length ? Math.min(...prestigeHistory) : 0;
  const seatCorr = correlation(seatSamples, seatWinSamples);
  const avgSeat = avg(seatSamples);

  const synergyIndex = round(
    clamp(winRate / 100, 0, 1) * 0.35 +
      clamp(contractSuccessRate / 100, 0, 1) * 0.15 +
      clamp(netAssistValue / 50, 0, 1) * 0.2 +
      clamp(avgObjectives / 4, 0, 1) * 0.15 +
      clamp(1 - Math.abs(seatCorr), 0, 1) * 0.15,
    3
  );

  const recentForm = buildRecentFormString(lastFiveResults);

  return {
    id: playerId,
    name: playerName,
    color: player.color,
    gamesPlayed,
    wins,
    winRate: round(winRate, 2),
    prestige: round(totalPrestige, 2),
    totalPrestige: round(totalPrestige, 2),
    avgPrestige: round(avgPrestigeValue, 2),
    avgPrestigePerGame: round(avgPrestigePerGame, 2),
    avgPrestigePerTurn: round(avgPrestigePerTurn, 3),
    directPrestige: round(totalDirectPrestige, 2),
    assistGiven: round(totalAssistGiven, 2),
    assistReceived: round(totalAssistReceived, 2),
    netAssistValue,
    netAssistBenefit: netAssistValue,
    objectiveRate: round(objectiveRate, 2),
    avgObjectives: round(avgObjectives, 2),
    avgObjectivesPerTrackedGame: round(avgObjectives, 2),
    objectivePrestige: round(totalObjectivePrestige, 2),
    objectiveShareOfPrestige: round(objectiveShareOfPrestige, 4),
    score: round(totalScore, 2),
    avgScorePerGame: round(avgScorePerGame, 2),
    contracts: totalSuccesses,
    failures: totalFailures,
    contractSuccessRate: round(contractSuccessRate, 2),
    contractFailureRate: round(contractFailureRate, 2),
    contractFailureRatio: round(contractFailureRatio, 4),
    efficiency: round(allEfficiency, 2),
    assistEfficiency: round(assistEfficiency, 2),
    assistedEfficiency: round(assistEfficiency, 2),
    directEfficiency: round(directEfficiency, 2),
    avgTurns: round(avgTurns, 2),
    stayAtBaseRate: round(stayAtBaseRate, 2),
    comebackWins: 0,
    bestPrestige: round(bestPrestige, 2),
    worstPrestige: round(worstPrestige, 2),
    synergyIndex,
    groupSynergyScore: synergyIndex,
    placement1: placementCounts.placement1,
    placement2: placementCounts.placement2,
    placement3: placementCounts.placement3,
    placement4: placementCounts.placement4,
    prestigeStdDev: round(prestigeStdDev, 3),
    recentForm,
    lastFiveResults,
    eloDelta: round(totalEloDelta, 2),
    eloChange: round(totalEloDelta, 2),
    eloTrend: round(totalEloDelta / Math.max(gamesPlayed, 1), 3),
    avgStartSeat: round(avgSeat, 2),
    avgStartOrder: round(avgSeat, 2),
    seatOrderWinRate: ratioString(wins, gamesPlayed),
    turnOrderWinRate: ratioString(wins, gamesPlayed),
    turnOrderWinCorrelation: round(seatCorr, 3),
    headToHeadEdge: round(seatCorr, 3),
    winRateByPlayerCount: ratioString(wins, gamesPlayed),
    sharedGameRate: ratioString(gamesPlayed, Array.isArray(games) ? games.length : 0),
    sharedGameWinRate: ratioString(wins, gamesPlayed),
  };
}
