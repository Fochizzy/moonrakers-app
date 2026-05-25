import type { Game, Group, StatsSnapshot } from "../../store/useStore";

type SelectStatsSnapshotInput = {
  personal?: Record<string, unknown> | null;
  global?: Record<string, unknown> | null;
  groups?: Array<Record<string, unknown> | null | undefined> | null;
  loadedAt?: number;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function toGroupSnapshot(group: Record<string, unknown>) {
  const payload =
    "payload" in group ? toRecord(group.payload) : toRecord(group);
  const groupId = String(
    group.groupId ?? group.group_id ?? payload.groupId ?? payload.group_id ?? "",
  ).trim();

  if (!groupId) {
    return null;
  }

  const name = String(group.name ?? payload.name ?? "").trim() || undefined;
  const updatedAt =
    typeof group.updatedAt === "string"
      ? group.updatedAt
      : typeof group.updated_at === "string"
        ? group.updated_at
        : null;

  return {
    ...payload,
    groupId,
    ...(name ? { name } : {}),
    updatedAt,
  };
}

function isMissingRelationError(error: { code?: string } | null | undefined) {
  return error?.code === "42P01";
}

export function selectStatsSnapshot(
  input: SelectStatsSnapshotInput,
): StatsSnapshot {
  return {
    personal: toRecord(input.personal),
    global: toRecord(input.global),
    groups: (input.groups ?? [])
      .map((group) => (group ? toGroupSnapshot(group) : null))
      .filter((group): group is NonNullable<ReturnType<typeof toGroupSnapshot>> => Boolean(group)),
    loadedAt:
      typeof input.loadedAt === "number" && Number.isFinite(input.loadedAt)
        ? input.loadedAt
        : Date.now(),
  };
}

type LoadStatsSnapshotInput = {
  profileId: string;
  groups?: Group[];
  games?: Game[];
};

export async function loadStatsSnapshot(
  input: LoadStatsSnapshotInput,
): Promise<StatsSnapshot> {
  const profileId = String(input.profileId ?? "").trim();
  const games = Array.isArray(input.games) ? input.games : [];
  const groups = Array.isArray(input.groups) ? input.groups : [];
  const { supabase } = await import("../supabase");

  const [globalResult, groupResult] = await Promise.all([
    supabase
      .from("global_stats_rollups")
      .select("key, payload, updated_at")
      .eq("key", "overview")
      .maybeSingle(),
    supabase
      .from("group_stats_rollups")
      .select("group_id, payload, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  if (globalResult.error && !isMissingRelationError(globalResult.error)) {
    throw globalResult.error;
  }

  if (groupResult.error && !isMissingRelationError(groupResult.error)) {
    throw groupResult.error;
  }

  const personalGames = games.filter((game) =>
    Array.isArray(game.players)
      ? game.players.some(
          (player) => String(player?.id ?? "").trim() === profileId,
        )
      : false,
  );

  const trackedGroupIds = new Set(
    personalGames
      .map((game) => String(game.groupId ?? "").trim())
      .filter(Boolean),
  );

  const groupsById = new Map(groups.map((group) => [group.id, group.name]));

  return selectStatsSnapshot({
    personal: {
      gamesPlayed: personalGames.length,
      hostedGames: personalGames.filter(
        (game) => String(game.hostProfileId ?? "").trim() === profileId,
      ).length,
      groupsTracked: trackedGroupIds.size,
      lastGameId: personalGames[0]?.id ?? null,
    },
    global: toRecord(globalResult.data?.payload),
    groups: (groupResult.data ?? []).map((group) => ({
      groupId: String(group.group_id ?? ""),
      name: groupsById.get(String(group.group_id ?? "")),
      payload: toRecord(group.payload),
      updatedAt:
        typeof group.updated_at === "string" ? group.updated_at : null,
    })),
  });
}
