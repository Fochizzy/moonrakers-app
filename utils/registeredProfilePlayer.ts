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

export function isLikelyRegisteredProfileId(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeId(value),
  );
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
