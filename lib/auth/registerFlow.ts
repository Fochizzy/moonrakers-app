type SignUpLikeUser = {
  id?: string | null;
} | null;

type SignUpLikeSession = {
  user?: SignUpLikeUser;
} | null;

type SignUpLikeResult = {
  session?: SignUpLikeSession;
  user?: SignUpLikeUser;
} | null;

function normalizePlayerName(value: string) {
  return value.trim();
}

function normalizeDisplayName(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function normalizeFavoriteColor(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

export function getImmediateProfileUserId(
  signUpResult: SignUpLikeResult,
): string | null {
  return signUpResult?.session?.user?.id ?? null;
}

export function buildSavedAuthProfile(
  userId: string,
  playerName: string,
  displayName: string,
  favoriteColor?: string | null,
  assignedCardArtIndex?: number | null,
) {
  return {
    id: userId,
    player_name: normalizePlayerName(playerName),
    display_name: normalizeDisplayName(displayName),
    favorite_color: normalizeFavoriteColor(favoriteColor),
    assigned_card_art_index:
      typeof assignedCardArtIndex === "number" && Number.isFinite(assignedCardArtIndex)
        ? assignedCardArtIndex
        : null,
  };
}
