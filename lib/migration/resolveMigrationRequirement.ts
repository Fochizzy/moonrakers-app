type LocalSummary = {
  playerCount?: number | null;
  groupCount?: number | null;
  gameCount?: number | null;
};

type RemoteMigrationState = {
  status?: string | null;
  local_players_count?: number | null;
  local_groups_count?: number | null;
  local_games_count?: number | null;
} | null;

type Input = {
  localSummary?: LocalSummary | null;
  remoteMigration?: RemoteMigrationState;
};

function toCount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getPlayerCount(summary: LocalSummary | RemoteMigrationState) {
  if (!summary) {
    return 0;
  }

  if ("playerCount" in summary) {
    return toCount((summary as LocalSummary).playerCount);
  }

  return toCount((summary as NonNullable<RemoteMigrationState>).local_players_count);
}

function getGroupCount(summary: LocalSummary | RemoteMigrationState) {
  if (!summary) {
    return 0;
  }

  if ("groupCount" in summary) {
    return toCount((summary as LocalSummary).groupCount);
  }

  return toCount((summary as NonNullable<RemoteMigrationState>).local_groups_count);
}

function getGameCount(summary: LocalSummary | RemoteMigrationState) {
  if (!summary) {
    return 0;
  }

  if ("gameCount" in summary) {
    return toCount((summary as LocalSummary).gameCount);
  }

  return toCount((summary as NonNullable<RemoteMigrationState>).local_games_count);
}

function hasAnyLegacyData(summary: LocalSummary | RemoteMigrationState) {
  return (
    getPlayerCount(summary) > 0 ||
    getGroupCount(summary) > 0 ||
    getGameCount(summary) > 0
  );
}

export function resolveMigrationRequirement(input: Input) {
  const remoteStatus = String(input.remoteMigration?.status ?? "").trim().toLowerCase();
  if (remoteStatus === "completed") {
    return false;
  }

  return (
    hasAnyLegacyData(input.localSummary ?? null) ||
    hasAnyLegacyData(input.remoteMigration ?? null)
  );
}
