import { safeDivide, safeNum } from "./eloMath";

export type AnyGame = Record<string, any>;
export type AnyParticipant = Record<string, any>;

export function toArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function firstDefined<T = unknown>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

export function getGameId(game: AnyGame, index = 0): string {
  return String(
    firstDefined(
      game?.id,
      game?.gameId,
      game?.uuid,
      game?.key,
      `game-${index}`
    )
  );
}

export function getGameTimestamp(game: AnyGame): number {
  const raw = firstDefined(
    game?.createdAt,
    game?.startedAt,
    game?.date,
    game?.timestamp,
    game?.endedAt
  );

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  if (typeof raw === "string" && raw.trim()) {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) return asNumber;

    const asDate = Date.parse(raw);
    if (Number.isFinite(asDate)) return asDate;
  }

  return 0;
}

export function getGameParticipants(game: AnyGame): AnyParticipant[] {
  const direct =
    toArray(game?.players)
      || toArray(game?.playerStats)
      || toArray(game?.results)
      || toArray(game?.participants);

  if (Array.isArray(game?.players) && game.players.length) return game.players;
  if (Array.isArray(game?.playerStats) && game.playerStats.length) return game.playerStats;
  if (Array.isArray(game?.results) && game.results.length) return game.results;
  if (Array.isArray(game?.participants) && game.participants.length) return game.participants;

  if (Array.isArray(game?.data?.players) && game.data.players.length) return game.data.players;
  if (Array.isArray(game?.data?.playerStats) && game.data.playerStats.length) return game.data.playerStats;
  if (Array.isArray(game?.data?.results) && game.data.results.length) return game.data.results;
  if (Array.isArray(game?.data?.participants) && game.data.participants.length) return game.data.participants;

  return [];
}

export function getParticipantId(p: AnyParticipant): string {
  return String(
    firstDefined(
      p?.playerId,
      p?.id,
      p?.profileId,
      p?.userId,
      p?.name,
      ""
    )
  );
}

export function getParticipantName(p: AnyParticipant, players: any[] = []): string {
  const id = getParticipantId(p);
  const fromStore = players.find((player) => String(player?.id) === id)?.name;

  return String(
    firstDefined(
      p?.name,
      p?.playerName,
      p?.displayName,
      fromStore,
      "Unknown"
    )
  );
}

export function getParticipantColor(p: AnyParticipant, players: any[] = []): string | undefined {
  const id = getParticipantId(p);
  const fromStore = players.find((player) => String(player?.id) === id)?.color;

  const color = firstDefined(
    p?.color,
    p?.playerColor,
    fromStore
  );

  return typeof color === "string" && color.trim() ? color : undefined;
}

export function getRank(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.rank,
      p?.place,
      p?.placement,
      p?.finishPosition,
      p?.position
    )
  );
}

export function getDidWin(p: AnyParticipant): 0 | 1 {
  const explicitWinner = firstDefined(
    p?.won,
    p?.isWinner,
    p?.winner,
    p?.didWin
  );

  if (typeof explicitWinner === "boolean") return explicitWinner ? 1 : 0;
  if (typeof explicitWinner === "number") return explicitWinner > 0 ? 1 : 0;

  const rank = getRank(p);
  return rank === 1 ? 1 : 0;
}

export function getPreGameElo(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.preGameElo,
      p?.eloBefore,
      p?.preElo,
      p?.startingElo,
      p?.ratingBefore
    )
  );
}

export function getPostGameElo(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.postGameElo,
      p?.eloAfter,
      p?.postElo,
      p?.endingElo,
      p?.ratingAfter,
      p?.elo,
      p?.rating
    )
  );
}

export function getScore(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.score,
      p?.totalPrestige,
      p?.prestige,
      p?.finalPrestige,
      p?.points
    )
  );
}

export function getTurns(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.turns,
      p?.turnCount,
      p?.turnsPlayed,
      p?.totalTurns,
      p?.rounds,
      p?.roundsPlayed
    )
  );
}

export function getAttempts(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.attempts,
      p?.missionsAttempted,
      p?.contracts,
      p?.missions
    )
  );
}

export function getFailures(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.failures,
      p?.failedMissions,
      p?.failureCount
    )
  );
}

export function getAssistsGiven(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.assistsGiven,
      p?.assists,
      p?.supportGiven
    )
  );
}

export function getAssistsReceived(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.assistsReceived,
      p?.assistPrestigeReceived,
      p?.supportReceived
    )
  );
}

export function getObjectivePrestige(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.objectivePrestige,
      p?.objectives,
      p?.objectivePoints,
      p?.directPrestige
    )
  );
}

export function getEfficiency(p: AnyParticipant): number {
  return safeNum(
    firstDefined(
      p?.efficiency,
      p?.efficiencyScore,
      p?.allEfficiency,
      p?.allContractsEfficiency,
      p?.scoreEfficiency
    )
  );
}

export function getEarlyLead(p: AnyParticipant): 0 | 1 {
  const value = firstDefined(p?.earlyLead, p?.hadEarlyLead);
  return value ? 1 : 0;
}

export function getLateLead(p: AnyParticipant): 0 | 1 {
  const value = firstDefined(p?.lateLead, p?.hadLateLead);
  return value ? 1 : 0;
}

export function getPrestigePerTurn(p: AnyParticipant): number {
  return safeDivide(getScore(p), Math.max(getTurns(p), 1));
}

export function getFailureRate(p: AnyParticipant): number {
  return safeDivide(getFailures(p), Math.max(getAttempts(p), 1));
}

export function getClutchScore(p: AnyParticipant): number {
  const explicit = firstDefined(p?.clutchScore);
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;

  const didWin = getDidWin(p);
  const ppt = getPrestigePerTurn(p);
  const lateLead = getLateLead(p);
  const failureRate = getFailureRate(p);

  return didWin ? ppt + lateLead * 0.75 - failureRate : ppt * 0.5;
}

export function getInteractionIndex(p: AnyParticipant): number {
  const explicit = firstDefined(p?.interactionIndex);
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;

  return getAssistsGiven(p) + getAssistsReceived(p) + getObjectivePrestige(p);
}

export function getAggroIndex(p: AnyParticipant): number {
  const explicit = firstDefined(p?.aggroIndex);
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;

  return getEarlyLead(p) + getLateLead(p) + getObjectivePrestige(p) * 0.25;
}

export function getTempoIndex(p: AnyParticipant): number {
  const explicit = firstDefined(p?.tempoIndex);
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;

  return getEfficiency(p) + getEarlyLead(p) * 0.5 + getPrestigePerTurn(p);
}

export function getFinalMargin(p: AnyParticipant, allParticipants: AnyParticipant[]): number {
  const myScore = getScore(p);
  const others = allParticipants
    .filter((entry) => entry !== p)
    .map(getScore)
    .sort((a, b) => b - a);

  const bestOther = others[0] ?? 0;
  return myScore - bestOther;
}

export function dedupeGames(games: AnyGame[]): AnyGame[] {
  const seen = new Set<string>();
  const result: AnyGame[] = [];

  for (let i = 0; i < games.length; i += 1) {
    const game = games[i];
    const id = getGameId(game, i);
    const ts = getGameTimestamp(game);
    const count = getGameParticipants(game).length;
    const signature = `${id}::${ts}::${count}`;

    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(game);
  }

  return result;
}
