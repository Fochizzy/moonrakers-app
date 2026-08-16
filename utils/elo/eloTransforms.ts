import { mean, safeNum } from "./eloMath";
import {
  dedupeGames,
  getAggroIndex,
  getAssistsGiven,
  getAssistsReceived,
  getClutchScore,
  getDidWin,
  getEarlyLead,
  getEfficiency,
  getFailureRate,
  getFailures,
  getFinalMargin,
  getGameId,
  getGameParticipants,
  getGameTimestamp,
  getInteractionIndex,
  getLateLead,
  getObjectivePrestige,
  getParticipantId,
  getParticipantName,
  getPostGameElo,
  getPreGameElo,
  getPrestigePerTurn,
  getScore,
  getTempoIndex,
  getTurns,
  getAttempts,
  type AnyGame,
  type AnyParticipant,
} from "./sourceResolvers";

type UnknownRecord = Record<string, unknown>;

export type EloGameRecord = {
  gameId: string;
  date: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  preGameElo: number;
  postGameElo: number;
  eloDelta: number;
  finishPosition: number;
  win: 0 | 1;
  lobbySize: number;
  seat?: number;
  opponentIds: string[];
  opponentElos: number[];
  opponentAvgElo: number;
  wasHighestRated: boolean;
  turns?: number;
  finalMargin?: number;
  score?: number;
  attempts?: number;
  failures?: number;
  efficiency?: number;
  prestigePerTurn?: number;
  objectivePrestige?: number;
  assistsGiven?: number;
  assistsReceived?: number;
  failureRate?: number;
  earlyLead?: 0 | 1;
  lateLead?: 0 | 1;
  clutchScore?: number;
  interactionIndex?: number;
  aggroIndex?: number;
  tempoIndex?: number;
};

type PreparedEntry = {
  participant: AnyParticipant;
  participantIndex: number;
  playerId: string;
  preGameElo: number;
  postGameElo: number;
  normalizedPreGameElo: number;
  normalizedPostGameElo: number;
  score: number;
  eloDelta: number;
  didWin: 0 | 1;
  finishPosition: number;
};

export function buildEloRecords(games: unknown[], players: unknown[]): EloGameRecord[] {
  const safeGames = dedupeGames(Array.isArray(games) ? (games as AnyGame[]) : []);
  const records: EloGameRecord[] = [];

  safeGames.forEach((game, gameIndex) => {
    const participants = getGameParticipants(game);
    if (!participants.length) return;

    const gameId = getGameId(game, gameIndex);
    const timestamp = getGameTimestamp(game);
    const rawTotalsMap = game?.totals;
    const totalsMap: UnknownRecord =
      rawTotalsMap && typeof rawTotalsMap === "object"
        ? (rawTotalsMap as UnknownRecord)
        : {};
    const winnerId = String(
      game?.manualWinnerId ?? game?.selectedWinnerId ?? game?.winnerId ?? ""
    );

    let prepared = participants
      .map((participant, participantIndex): PreparedEntry | null => {
        const playerId = getParticipantId(participant);
        if (!playerId) return null;

        const rawTotals = totalsMap[playerId] ?? null;
        const totals =
          rawTotals && typeof rawTotals === "object"
            ? (rawTotals as UnknownRecord)
            : null;
        const merged: AnyParticipant = totals
          ? { ...participant, ...totals }
          : participant;

        const preGameElo = getPreGameElo(merged);
        const postGameElo = getPostGameElo(merged);
        const score = getScore(merged);
        const didWin: 0 | 1 =
          winnerId && winnerId === playerId ? 1 : getDidWin(merged);

        let eloDelta = 0;
        let normalizedPreGameElo = preGameElo;
        let normalizedPostGameElo = postGameElo;

        if (preGameElo && postGameElo) {
          eloDelta = postGameElo - preGameElo;
        } else if (Number.isFinite(Number(merged?.eloDelta))) {
          eloDelta = Number(merged.eloDelta);
        } else if (Number.isFinite(Number(participant?.eloDelta))) {
          eloDelta = Number(participant.eloDelta);
        } else {
          const syntheticBase = 1000 + score * 4;
          const syntheticResultBonus =
            (didWin ? 24 : -12) +
            safeNum(merged?.totalPrestige ?? merged?.score ?? score) * 0.15;

          normalizedPreGameElo = syntheticBase;
          eloDelta = syntheticResultBonus;
          normalizedPostGameElo = normalizedPreGameElo + eloDelta;
        }

        if (!normalizedPreGameElo && normalizedPostGameElo) {
          normalizedPreGameElo = normalizedPostGameElo - eloDelta;
        }
        if (!normalizedPostGameElo && normalizedPreGameElo) {
          normalizedPostGameElo = normalizedPreGameElo + eloDelta;
        }

        const rawFinishPosition = safeNum(
          merged?.rank ??
            merged?.place ??
            merged?.placement ??
            merged?.finishPosition ??
            merged?.position
        );
        const finishPosition =
          rawFinishPosition > 0 ? rawFinishPosition : didWin ? 1 : 0;

        return {
          participant: merged,
          participantIndex,
          playerId,
          preGameElo,
          postGameElo,
          normalizedPreGameElo,
          normalizedPostGameElo,
          score,
          eloDelta,
          didWin,
          finishPosition,
        };
      })
      .filter((entry): entry is PreparedEntry => entry !== null);

    if (!prepared.length) return;

    const inferredWinnerId =
      winnerId ||
      [...prepared].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.playerId ||
      "";

    prepared = prepared.map((entry) => ({
      ...entry,
      didWin:
        entry.didWin ||
        (inferredWinnerId && entry.playerId === inferredWinnerId ? 1 : 0),
      finishPosition:
        entry.finishPosition > 0
          ? entry.finishPosition
          : inferredWinnerId && entry.playerId === inferredWinnerId
            ? 1
            : entry.finishPosition,
    }));

    const lobbyReferences = prepared
      .map((entry) => entry.normalizedPreGameElo || entry.normalizedPostGameElo || entry.score)
      .filter((value) => Number.isFinite(value));

    const highestLobbyRating = lobbyReferences.length ? Math.max(...lobbyReferences) : 0;

    prepared.forEach((entry) => {
      const p = entry.participant;
      const opponentEntries = prepared.filter((other) => other.playerId !== entry.playerId);

      const opponentIds = opponentEntries.map((other) => other.playerId);
      const opponentElos = opponentEntries
        .map((other) => other.normalizedPreGameElo || other.normalizedPostGameElo || other.score)
        .filter((value) => Number.isFinite(value));

      const opponentAvgElo = opponentElos.length ? mean(opponentElos) : 0;
      const myReferenceRating =
        entry.normalizedPreGameElo || entry.normalizedPostGameElo || entry.score;

      records.push({
        gameId,
        date: timestamp ? new Date(timestamp).toISOString() : "",
        timestamp,
        playerId: entry.playerId,
        playerName: getParticipantName(p, players),
        preGameElo: entry.normalizedPreGameElo || entry.preGameElo,
        postGameElo: entry.normalizedPostGameElo || entry.postGameElo,
        eloDelta: entry.eloDelta,
        finishPosition: entry.finishPosition,
        win: entry.didWin,
        lobbySize: prepared.length,
        seat: entry.participantIndex + 1,
        opponentIds,
        opponentElos,
        opponentAvgElo,
        wasHighestRated:
          highestLobbyRating > 0 && myReferenceRating >= highestLobbyRating,
        turns: getTurns(p),
        finalMargin: getFinalMargin(p, participants),
        score: entry.score,
        attempts: getAttempts(p),
        failures: getFailures(p),
        efficiency: getEfficiency(p),
        prestigePerTurn: getPrestigePerTurn(p),
        objectivePrestige: getObjectivePrestige(p),
        assistsGiven: getAssistsGiven(p),
        assistsReceived: getAssistsReceived(p),
        failureRate: getFailureRate(p),
        earlyLead: getEarlyLead(p),
        lateLead: getLateLead(p),
        clutchScore: getClutchScore(p),
        interactionIndex: getInteractionIndex(p),
        aggroIndex: getAggroIndex(p),
        tempoIndex: getTempoIndex(p),
      });
    });
  });

  return records.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.gameId !== b.gameId) return a.gameId.localeCompare(b.gameId);
    return a.playerId.localeCompare(b.playerId);
  });
}

