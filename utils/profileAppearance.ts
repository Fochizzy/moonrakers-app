import {
  buildArtIndexFromRowAndColor,
  getAllArtIndicesForColor,
  normalizeCardColor,
  type CardColor,
} from "./cardAssignment";
import { isValidPlayerCardArtIndex } from "./playerCards";

export const PROFILE_COLOR_OPTIONS: CardColor[] = [
  "blue",
  "green",
  "purple",
  "orange",
  "yellow",
];

type ProfileAppearanceLike = {
  favoriteColor?: string | null;
  assignedCardArtIndex?: number | null;
};

type BuildProfileAppearanceSavePayloadInput = {
  playerName: string;
  displayName?: string | null;
  favoriteColor?: string | null;
  assignedCardArtIndex?: number | null;
};

export function normalizePreferredProfileColor(value?: string | null): CardColor | null {
  return normalizeCardColor(typeof value === "string" ? value.trim() : value ?? undefined);
}

export function getDefaultAssignedCardArtIndexForColor(color?: string | null) {
  const normalized = normalizePreferredProfileColor(color);
  if (!normalized) return null;
  return buildArtIndexFromRowAndColor(0, normalized);
}

export function isAssignedCardArtIndexForColor(
  artIndex: unknown,
  color?: string | null,
) {
  if (!isValidPlayerCardArtIndex(artIndex)) return false;
  const normalized = normalizePreferredProfileColor(color);
  if (!normalized) return false;
  return getAllArtIndicesForColor(normalized).includes(artIndex);
}

export function resolveAssignedCardArtIndexForProfile(
  input: ProfileAppearanceLike,
) {
  if (isAssignedCardArtIndexForColor(input.assignedCardArtIndex, input.favoriteColor)) {
    return input.assignedCardArtIndex as number;
  }

  return getDefaultAssignedCardArtIndexForColor(input.favoriteColor);
}

export function buildProfileAppearanceSavePayload(
  input: BuildProfileAppearanceSavePayloadInput,
) {
  const normalizedPlayerName = String(input.playerName ?? "").trim();
  const normalizedDisplayName = String(input.displayName ?? "").trim();
  const normalizedFavoriteColor = normalizePreferredProfileColor(input.favoriteColor);

  return {
    player_name: normalizedPlayerName,
    display_name: normalizedDisplayName || null,
    favorite_color: normalizedFavoriteColor,
    assigned_card_art_index: resolveAssignedCardArtIndexForProfile({
      favoriteColor: normalizedFavoriteColor,
      assignedCardArtIndex: input.assignedCardArtIndex,
    }),
  };
}
