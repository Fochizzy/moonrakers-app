import type { Game } from "../../store/useStore";

type RawRegisteredProfile = {
  id?: unknown;
  player_name?: unknown;
  display_name?: unknown;
  favorite_color?: unknown;
  assigned_card_art_index?: unknown;
};

export type RegisteredProfile = {
  id: string;
  name: string;
  displayName?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  hasSavedGames: boolean;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function hasSavedGamePlayerIds(games: Game[]) {
  return new Set(
    (Array.isArray(games) ? games : []).flatMap((game) =>
      Array.isArray(game?.players)
        ? game.players
            .map((player) => normalizeString(player?.id))
            .filter(Boolean)
        : [],
    ),
  );
}

export function syncRegisteredProfilesWithGames(
  profiles: RegisteredProfile[],
  games: Game[] = [],
) {
  const idsWithSavedGames = hasSavedGamePlayerIds(games);

  return (Array.isArray(profiles) ? profiles : []).map((profile) => ({
    ...profile,
    hasSavedGames: idsWithSavedGames.has(profile.id),
  }));
}

export function normalizeRegisteredProfiles(
  input: RawRegisteredProfile[],
  games: Game[] = [],
): RegisteredProfile[] {
  const normalizedProfiles = (Array.isArray(input) ? input : [])
    .map<RegisteredProfile | null>((row) => {
      const id = normalizeString(row?.id);
      const name = normalizeString(row?.player_name);
      const displayName = normalizeString(row?.display_name);

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        displayName: displayName || undefined,
        color: normalizeString(row?.favorite_color) || undefined,
        assignedCardArtIndex:
          typeof row?.assigned_card_art_index === "number" &&
          Number.isFinite(row.assigned_card_art_index)
            ? row.assigned_card_art_index
            : null,
        hasSavedGames: false,
      };
    })
    .filter((profile): profile is RegisteredProfile => Boolean(profile));

  return syncRegisteredProfilesWithGames(normalizedProfiles, games);
}

export function sortRegisteredProfiles(profiles: RegisteredProfile[]) {
  return [...profiles].sort((left, right) => {
    const nameOrder = left.name.localeCompare(right.name);
    if (nameOrder !== 0) {
      return nameOrder;
    }

    const displayOrder = (left.displayName ?? "").localeCompare(
      right.displayName ?? "",
    );
    if (displayOrder !== 0) {
      return displayOrder;
    }

    return left.id.localeCompare(right.id);
  });
}
