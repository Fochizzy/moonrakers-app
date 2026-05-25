type ExistingPlayerLike = {
  id?: string;
  name?: string;
  initials?: string;
  displayName?: string;
  color?: string;
  hasSavedGames?: boolean;
  assignedCardArtIndex?: number | null;
};

type RegisteredProfilePlayerLike = {
  id?: string;
  name?: string;
  displayName?: string;
  color?: string;
  hasSavedGames?: boolean;
  assignedCardArtIndex?: number | null;
};

export type MergedRegisteredProfilePlayer = {
  id: string;
  name: string;
  initials?: string;
  displayName?: string;
  color?: string;
  hasSavedGames?: boolean;
  assignedCardArtIndex?: number | null;
};

type SelectableGroupLike = {
  id?: string;
  name?: string;
  playerIds?: string[];
};

export type CanonicalSelectablePlayersResult<TGroup extends SelectableGroupLike> = {
  players: MergedRegisteredProfilePlayer[];
  groups: TGroup[];
  aliases: Record<string, string>;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeName(value);
  return normalized || undefined;
}

function getInitialsFromName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeAssignedCardArtIndex(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeNameKey(value: unknown) {
  return normalizeName(value).toLowerCase();
}

export function isLikelyRegisteredProfileId(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeId(value),
  );
}

function buildPlayerPriority(player: ExistingPlayerLike | null | undefined) {
  return [
    isLikelyRegisteredProfileId(player?.id) ? 1 : 0,
    player?.hasSavedGames ? 1 : 0,
    normalizeOptionalString(player?.displayName) ? 1 : 0,
    normalizeAssignedCardArtIndex(player?.assignedCardArtIndex) != null ? 1 : 0,
    normalizeOptionalString(player?.color) ? 1 : 0,
  ];
}

function comparePlayerPriority(
  left: ExistingPlayerLike | null | undefined,
  right: ExistingPlayerLike | null | undefined,
) {
  const leftPriority = buildPlayerPriority(left);
  const rightPriority = buildPlayerPriority(right);

  for (let index = 0; index < leftPriority.length; index += 1) {
    const delta = (rightPriority[index] ?? 0) - (leftPriority[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }

  return 0;
}

function shouldCollapsePlayerNameGroup(players: ExistingPlayerLike[]) {
  return players.length > 1 && players.some((player) => isLikelyRegisteredProfileId(player?.id));
}

function mergeDuplicateSelectablePlayers(
  preferred: ExistingPlayerLike,
  duplicates: ExistingPlayerLike[],
): MergedRegisteredProfilePlayer | null {
  const ordered = [
    preferred,
    ...duplicates.filter((player) => normalizeId(player?.id) !== normalizeId(preferred.id)),
  ];

  const preferredId = normalizeId(preferred.id);
  const preferredName =
    normalizeName(preferred.name) || normalizeName(ordered[0]?.name) || "Player";

  if (!preferredId || !preferredName) {
    return null;
  }

  return {
    id: preferredId,
    name: preferredName,
    initials:
      ordered.map((player) => normalizeOptionalString(player?.initials)).find(Boolean) ??
      normalizeOptionalString(getInitialsFromName(preferredName)),
    displayName: ordered
      .map((player) => normalizeOptionalString(player?.displayName))
      .find(Boolean),
    color: ordered.map((player) => normalizeOptionalString(player?.color)).find(Boolean),
    hasSavedGames: ordered.some((player) => Boolean(player?.hasSavedGames)),
    assignedCardArtIndex:
      ordered
        .map((player) => normalizeAssignedCardArtIndex(player?.assignedCardArtIndex))
        .find((value) => value != null) ?? null,
  };
}

function remapGroupPlayerIds(playerIds: string[], aliases: Record<string, string>) {
  const dedupedIds: string[] = [];
  const seen = new Set<string>();

  for (const rawId of Array.isArray(playerIds) ? playerIds : []) {
    const normalizedId = normalizeId(rawId);
    const canonicalId = aliases[normalizedId] ?? normalizedId;
    if (!canonicalId || seen.has(canonicalId)) {
      continue;
    }
    seen.add(canonicalId);
    dedupedIds.push(canonicalId);
  }

  return dedupedIds;
}

export function mergeRegisteredProfileIntoPlayer(
  existing: ExistingPlayerLike | null | undefined,
  profile: RegisteredProfilePlayerLike | null | undefined,
): MergedRegisteredProfilePlayer | null {
  const id = normalizeId(profile?.id ?? existing?.id);
  const name = normalizeName(profile?.name ?? existing?.name);

  if (!id || !name) {
    return null;
  }

  const existingAssignedCardArtIndex = normalizeAssignedCardArtIndex(
    existing?.assignedCardArtIndex,
  );
  const incomingAssignedCardArtIndex = normalizeAssignedCardArtIndex(
    profile?.assignedCardArtIndex,
  );

  return {
    id,
    name,
    initials:
      normalizeOptionalString(existing?.initials) ||
      normalizeOptionalString(getInitialsFromName(name)),
    displayName:
      normalizeOptionalString(profile?.displayName) ??
      normalizeOptionalString(existing?.displayName),
    color:
      normalizeOptionalString(profile?.color) ??
      normalizeOptionalString(existing?.color),
    hasSavedGames:
      typeof profile?.hasSavedGames === "boolean"
        ? profile.hasSavedGames
        : Boolean(existing?.hasSavedGames),
    assignedCardArtIndex:
      incomingAssignedCardArtIndex ?? existingAssignedCardArtIndex ?? null,
  };
}

export function mergeRegisteredProfilesIntoPlayers<
  TPlayer extends ExistingPlayerLike,
  TProfile extends RegisteredProfilePlayerLike,
>(players: TPlayer[], profiles: TProfile[]) {
  const merged = new Map<string, MergedRegisteredProfilePlayer>();

  for (const player of Array.isArray(players) ? players : []) {
    const nextPlayer = mergeRegisteredProfileIntoPlayer(player, player);
    if (!nextPlayer) continue;
    merged.set(nextPlayer.id, nextPlayer);
  }

  for (const profile of Array.isArray(profiles) ? profiles : []) {
    const profileId = normalizeId(profile?.id);
    if (!profileId) continue;

    const nextPlayer = mergeRegisteredProfileIntoPlayer(
      merged.get(profileId),
      profile,
    );
    if (!nextPlayer) continue;
    merged.set(nextPlayer.id, nextPlayer);
  }

  return Array.from(merged.values());
}

export function canonicalizeSelectablePlayers<
  TPlayer extends ExistingPlayerLike,
  TGroup extends SelectableGroupLike,
>(players: TPlayer[], groups: TGroup[]): CanonicalSelectablePlayersResult<TGroup> {
  const groupedByName = new Map<string, ExistingPlayerLike[]>();
  const aliases: Record<string, string> = {};
  const canonicalPlayers: MergedRegisteredProfilePlayer[] = [];

  for (const player of Array.isArray(players) ? players : []) {
    const playerId = normalizeId(player?.id);
    const playerNameKey = normalizeNameKey(player?.name) || playerId;
    if (!playerId) {
      continue;
    }

    if (!groupedByName.has(playerNameKey)) {
      groupedByName.set(playerNameKey, []);
    }
    groupedByName.get(playerNameKey)?.push(player);
  }

  for (const duplicateGroup of groupedByName.values()) {
    if (!shouldCollapsePlayerNameGroup(duplicateGroup)) {
      for (const player of duplicateGroup) {
        const nextPlayer = mergeRegisteredProfileIntoPlayer(player, player);
        if (!nextPlayer) {
          continue;
        }
        aliases[nextPlayer.id] = nextPlayer.id;
        canonicalPlayers.push(nextPlayer);
      }
      continue;
    }

    const preferred =
      [...duplicateGroup].sort(comparePlayerPriority)[0] ?? duplicateGroup[0] ?? null;

    if (!preferred) {
      continue;
    }

    const mergedPlayer = mergeDuplicateSelectablePlayers(preferred, duplicateGroup);
    if (!mergedPlayer) {
      continue;
    }

    for (const player of duplicateGroup) {
      const playerId = normalizeId(player?.id);
      if (!playerId) {
        continue;
      }
      aliases[playerId] = mergedPlayer.id;
    }

    canonicalPlayers.push(mergedPlayer);
  }

  const canonicalGroups = (Array.isArray(groups) ? groups : []).map((group) => ({
    ...group,
    playerIds: remapGroupPlayerIds(group?.playerIds ?? [], aliases),
  }));

  return {
    players: canonicalPlayers,
    groups: canonicalGroups,
    aliases,
  };
}

export function buildCloudPlayableCommandDirectory<
  TPlayer extends ExistingPlayerLike,
  TGroup extends SelectableGroupLike,
>(players: TPlayer[], groups: TGroup[]): CanonicalSelectablePlayersResult<TGroup> {
  const canonical = canonicalizeSelectablePlayers(players, groups);
  const cloudPlayers = canonical.players.filter((player) =>
    isLikelyRegisteredProfileId(player.id),
  );
  const cloudPlayerIds = new Set(cloudPlayers.map((player) => player.id));

  const cloudGroups = canonical.groups.filter((group) => {
    const normalizedGroupId = normalizeId(group?.id);
    const normalizedPlayerIds = remapGroupPlayerIds(
      group?.playerIds ?? [],
      canonical.aliases,
    );

    return (
      isLikelyRegisteredProfileId(normalizedGroupId) &&
      normalizedPlayerIds.length >= 2 &&
      normalizedPlayerIds.every((playerId) => cloudPlayerIds.has(playerId))
    );
  });

  return {
    players: cloudPlayers,
    groups: cloudGroups.map((group) => ({
      ...group,
      playerIds: remapGroupPlayerIds(group?.playerIds ?? [], canonical.aliases),
    })),
    aliases: canonical.aliases,
  };
}
