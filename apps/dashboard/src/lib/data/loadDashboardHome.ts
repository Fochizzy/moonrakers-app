import { getAnalyticsHome, getEloScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { buildHistoryRows } from "../history/historyRows";
import { resolvePlayerName } from "../playerName";
import { normalizeOptionalSearchParam } from "../readSearchParam";
import { loadGameArchiveWithClient } from "./loadGameArchive";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadDashboardHomeInput = {
  focusPlayerId?: string | null;
};

/** How many finished games the home overview strip shows. */
const RECENT_GAME_COUNT = 3;

export async function loadDashboardHome(input: LoadDashboardHomeInput = {}) {
  const { supabase, userId, profile } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const requestedFocusPlayerId = normalizeOptionalSearchParam(
    input.focusPlayerId,
  );
  const effectiveProfileId = requestedFocusPlayerId ?? userId;
  let focusProfileName = resolvePlayerName(profile, "Commander");

  if (effectiveProfileId !== userId) {
    const { data: focusProfile } = await supabase
      .from("profiles")
      .select("id, player_name, display_name")
      .eq("id", effectiveProfileId)
      .maybeSingle();

    if (focusProfile) {
      focusProfileName = resolvePlayerName(focusProfile, focusProfileName);
    }
  }

  // The archive and leaderboard turn the home route into an actual overview
  // rather than a second copy of the analytics hub's tile list.
  // `profileId` is the requester, never the focused player: the RPC raises when
  // the two differ, which used to take the whole route down through the error
  // boundary the moment the topbar focused anyone else.
  const [payload, eloScreen, archive] = await Promise.all([
    getAnalyticsHome(client, {
      profileId: userId,
      focusPlayerId: requestedFocusPlayerId,
    }),
    getEloScreen(client, {
      profileId: userId,
      focusPlayerId: effectiveProfileId,
      opponentId: null,
      sortKey: "elo",
    }).catch(() => null),
    loadGameArchiveWithClient(supabase as never, userId).catch(() => null),
  ]);

  const historyRows = archive
    ? buildHistoryRows(archive.games, userId)
    : [];
  const recentGames = [...historyRows]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, RECENT_GAME_COUNT);

  return {
    focusProfileName,
    focusPlayerId: effectiveProfileId,
    leaderboardRows: eloScreen?.leaderboardRows ?? [],
    payload,
    recentGames,
    summary: eloScreen?.summary ?? null,
    totalGames: historyRows.length,
  };
}
