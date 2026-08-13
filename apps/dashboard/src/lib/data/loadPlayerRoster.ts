import { getEloScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { toGameArchive } from "./gameArchive";
import type { ArchiveGroup } from "./gameArchiveTypes";
import { createAnalyticsRpcClient } from "./rpcClient";

import { normalizeCloudSnapshot } from "../../../../../lib/cloud/normalizeCloudSnapshot";

export type RosterPlayer = {
  assignedCardArtIndex: number | null;
  avgPrestige: number;
  color: string | null;
  currentElo: number;
  gamesPlayed: number;
  id: string;
  losses: number;
  name: string;
  peakElo: number;
  prestige: number;
  rank: number;
  score: number;
  wins: number;
};

export type RosterGroup = ArchiveGroup & {
  memberNames: string[];
};

export type PlayerRoster = {
  groups: RosterGroup[];
  players: RosterPlayer[];
  signedInPlayerId: string;
};

const GROUP_SELECT = `
  id,
  name,
  created_at,
  group_members (
    position,
    profile:profiles (
      id,
      player_name,
      display_name,
      favorite_color,
      assigned_card_art_index
    )
  )
`;

/**
 * Roster for the player directory and card gallery. Ratings come from the
 * server-authored ELO leaderboard so the web numbers match the app, while group
 * membership is read straight from the shared-group tables.
 */
export async function loadPlayerRoster(): Promise<PlayerRoster> {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  const [eloScreen, groupsResult] = await Promise.all([
    getEloScreen(client, {
      profileId: userId,
      focusPlayerId: null,
      opponentId: null,
      sortKey: null,
    }),
    supabase.from("groups").select(GROUP_SELECT).order("name", {
      ascending: true,
    }),
  ]);

  if (groupsResult.error) {
    throw groupsResult.error;
  }

  const snapshot = normalizeCloudSnapshot({
    groups: (groupsResult.data ?? []) as never,
  });
  const archive = toGameArchive(snapshot);
  const playerNamesById = new Map(
    archive.players.map((player) => [player.id, player.name]),
  );

  const leaderboardIds = new Set(
    eloScreen.leaderboardRows.map((row) => String(row.playerId)),
  );

  const players: RosterPlayer[] = eloScreen.leaderboardRows.map((row) => ({
    assignedCardArtIndex: row.assignedCardArtIndex ?? null,
    avgPrestige: row.avgPrestige,
    color: row.color ?? null,
    currentElo: row.currentElo,
    gamesPlayed: row.gamesPlayed,
    id: String(row.playerId),
    losses: row.losses,
    name: row.name,
    peakElo: row.peakElo,
    prestige: row.prestige,
    rank: row.rank,
    score: row.score,
    wins: row.wins,
  }));

  // Players who are on the roster but have no rated games yet still belong in
  // the directory, so fold in any option the leaderboard did not cover.
  eloScreen.playerOptions.forEach((option) => {
    const id = String(option.id);
    if (!id || leaderboardIds.has(id)) {
      return;
    }

    players.push({
      assignedCardArtIndex: option.assignedCardArtIndex ?? null,
      avgPrestige: 0,
      color: option.color ?? null,
      currentElo: option.currentElo ?? 0,
      gamesPlayed: option.gamesPlayed ?? 0,
      id,
      losses: 0,
      name: option.name || option.label || "Player",
      peakElo: option.currentElo ?? 0,
      prestige: 0,
      rank: players.length + 1,
      score: 0,
      wins: 0,
    });
  });

  players.forEach((player) => {
    playerNamesById.set(player.id, player.name);
  });

  return {
    groups: archive.groups.map((group) => ({
      ...group,
      memberNames: group.playerIds
        .map((playerId) => playerNamesById.get(playerId) ?? "Player")
        .sort((left, right) => left.localeCompare(right)),
    })),
    players,
    signedInPlayerId: userId,
  };
}
