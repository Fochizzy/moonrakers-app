type RegisteredProfileLike = {
  id?: string | null;
  displayName?: string | null;
};

type DisplayNameConflictArgs = {
  displayName?: string | null;
  currentUserId?: string | null;
  profiles?: RegisteredProfileLike[];
};

export function normalizeDisplayNameForUniqueness(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

export function findDisplayNameConflict({
  displayName,
  currentUserId,
  profiles = [],
}: DisplayNameConflictArgs) {
  const normalizedDisplayName = normalizeDisplayNameForUniqueness(displayName);
  const normalizedCurrentUserId = String(currentUserId ?? "").trim();

  if (!normalizedDisplayName) {
    return null;
  }

  return (
    (Array.isArray(profiles) ? profiles : []).find((profile) => {
      const profileId = String(profile?.id ?? "").trim();
      if (!profileId || profileId === normalizedCurrentUserId) {
        return false;
      }

      return (
        normalizeDisplayNameForUniqueness(profile?.displayName) ===
        normalizedDisplayName
      );
    }) ?? null
  );
}

export function buildDuplicateDisplayNameMessage(displayName?: string | null) {
  const trimmedDisplayName = String(displayName ?? "").trim();

  if (!trimmedDisplayName) {
    return "Display name already in use. Please choose a unique display name.";
  }

  return `Display name "${trimmedDisplayName}" is already in use. Please choose a unique display name.`;
}
