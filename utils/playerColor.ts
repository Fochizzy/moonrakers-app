// utils/playerColor.ts

export const PLAYER_COLOR_NAMES = [
  "green",
  "purple",
  "blue",
  "orange",
  "yellow",
] as const;

export type PlayerColorName = (typeof PLAYER_COLOR_NAMES)[number];

const LEGACY_COLOR_MAP: Record<string, PlayerColorName> = {
  green: "green",
  lime: "green",
  "#22c55e": "green",

  purple: "purple",
  violet: "purple",
  indigo: "purple",
  "#8b5cf6": "purple",
  "#a855f7": "purple",

  blue: "blue",
  sky: "blue",
  cyan: "blue",
  "#38bdf8": "blue",
  "#3b82f6": "blue",

  orange: "orange",
  amber: "orange",
  "#f59e0b": "orange",
  "#f97316": "orange",
  "#ff8c00": "orange",

  yellow: "yellow",
  gold: "yellow",
  "#eab308": "yellow",
  "#facc15": "yellow",
};

export function isPlayerColorName(value: unknown): value is PlayerColorName {
  return (
    typeof value === "string" &&
    PLAYER_COLOR_NAMES.includes(value.trim().toLowerCase() as PlayerColorName)
  );
}

export function normalizeStoredPlayerColor(
  color?: string | null,
  fallback: PlayerColorName = "blue"
): PlayerColorName {
  const normalized = String(color ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return fallback;
  return LEGACY_COLOR_MAP[normalized] ?? fallback;
}

export function getFallbackPlayerColor(index = 0): PlayerColorName {
  return PLAYER_COLOR_NAMES[index % PLAYER_COLOR_NAMES.length];
}

export function resolveStoredPlayerColor(
  color?: string | null,
  index = 0
): PlayerColorName {
  return normalizeStoredPlayerColor(color, getFallbackPlayerColor(index));
}

export function serializePlayerColor(
  color?: string | null,
  index = 0
): PlayerColorName {
  return resolveStoredPlayerColor(color, index);
}

export function migratePlayersToThemeColors<T extends { color?: string | null }>(
  players: T[]
): Array<Omit<T, "color"> & { color: PlayerColorName }> {
  return players.map((player, index) => ({
    ...player,
    color: resolveStoredPlayerColor(player.color, index),
  }));
}