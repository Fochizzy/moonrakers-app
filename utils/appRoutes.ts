export const HOME_TABS = ["game", "leaderboard", "hubs"] as const;

export type HomeTab = (typeof HOME_TABS)[number];

export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  authCallback: "/auth/callback",
  resetPassword: "/reset-password",
  leaderboard: "/leaderboard",
  analytics: "/analytics",
  players: "/players",
  history: "/history",
  compare: "/charts/compare",
  charts: "/charts",
  stats: "/stats",
  elo: "/elo",
  insights: "/insights",
  definitions: "/definitions",
  dataBackup: "/data-backup",
  roster: "/add-players",
  playerDirectory: "/player-profile",
  playerProfileDetail: "/player-profile/[playerId]",
  playerCards: "/player-cards",
  game: "/game",
  headToHeadMission: "/head-to-head-mission",
  gameSetup: "/game-setup",
  summary: "/summary",
  gameTrends: "/game-trends",
  replay: "/charts/replay",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

export function isHomeTab(value: unknown): value is HomeTab {
  return typeof value === "string" && HOME_TABS.includes(value as HomeTab);
}

export function normalizeHomeTab(value: unknown): HomeTab {
  if (value === "nav") {
    return "hubs";
  }

  return isHomeTab(value) ? value : "game";
}

export function buildHomeRoute(initialTab: HomeTab = "game") {
  if (initialTab === "game") {
    return { pathname: APP_ROUTES.home } as const;
  }

  return {
    pathname: APP_ROUTES.home,
    params: { initialTab },
  } as const;
}

export function buildCompareRoute(input?: {
  mode?: "players" | "groups";
  ids?: string[];
}) {
  const ids = (input?.ids ?? []).map((id) => String(id).trim()).filter(Boolean);

  return {
    pathname: APP_ROUTES.compare,
    params: {
      ...(input?.mode ? { mode: input.mode } : {}),
      ...(ids.length ? { ids: ids.join(",") } : {}),
    },
  } as const;
}

export function buildChartsRoute(input?: {
  playerId?: string | null;
  compareId?: string | null;
  compareIds?: string[];
  ids?: string[];
  setup?: boolean;
}) {
  const ids = (input?.ids ?? []).map((id) => String(id).trim()).filter(Boolean);
  const playerId = String(input?.playerId ?? "").trim();
  const compareId = String(input?.compareId ?? "").trim();
  const compareIds = (input?.compareIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);

  return {
    pathname: APP_ROUTES.charts,
    params: {
      ...(playerId ? { playerId } : {}),
      ...(compareId ? { compareId } : {}),
      ...(compareIds.length ? { compareIds: compareIds.join(",") } : {}),
      ...(ids.length ? { ids: ids.join(",") } : {}),
      ...(input?.setup ? { setup: "1" } : {}),
    },
  } as const;
}

export function buildHistoryRoute(input?: {
  gameId?: string | null;
}) {
  const gameId = String(input?.gameId ?? "").trim();

  return {
    pathname: APP_ROUTES.history,
    params: gameId ? { gameId } : undefined,
  } as const;
}

export function buildPlayerProfileRoute(playerId: string) {
  return {
    pathname: APP_ROUTES.playerProfileDetail,
    params: { playerId },
  } as const;
}

export function buildSummaryRoute(gameId: string) {
  return {
    pathname: APP_ROUTES.summary,
    params: { gameId },
  } as const;
}

export function buildGameTrendsRoute(gameId: string) {
  return {
    pathname: APP_ROUTES.gameTrends,
    params: { gameId },
  } as const;
}

export function buildDefinitionsRoute(metric: string);
export function buildDefinitionsRoute(input: {
  metric?: string | null;
  category?: string | null;
  sourceLabel?: string | null;
});
export function buildDefinitionsRoute(
  input:
    | string
    | {
        metric?: string | null;
        category?: string | null;
        sourceLabel?: string | null;
      }
) {
  if (typeof input === "string") {
    const metric = input.trim();
    return {
      pathname: APP_ROUTES.definitions,
      params: { metric },
    } as const;
  }

  const metric = String(input?.metric ?? "").trim();
  const category = String(input?.category ?? "").trim();
  const sourceLabel = String(input?.sourceLabel ?? "").trim();

  return {
    pathname: APP_ROUTES.definitions,
    params: {
      ...(metric ? { metric } : {}),
      ...(category ? { category } : {}),
      ...(sourceLabel ? { sourceLabel } : {}),
    },
  } as const;
}

export function resolveDefinitionSourceLabel(pathname: string | null | undefined) {
  const normalized = String(pathname ?? "").trim().toLowerCase();

  if (!normalized) return null;
  if (normalized === "/" || normalized.startsWith("/?")) return "Command";
  if (normalized.startsWith("/analytics")) return "Analytics";
  if (normalized.startsWith("/stats")) return "Stats";
  if (normalized.startsWith("/elo")) return "ELO";
  if (normalized.startsWith("/insights")) return "Insights";
  if (normalized.startsWith("/player-cards")) return "Player Cards";
  if (normalized.startsWith("/player-profile")) return "Player Profile";
  if (normalized.startsWith("/summary")) return "Summary";
  if (normalized.startsWith("/charts/compare")) return "Compare";
  if (normalized.startsWith("/charts")) return "Charts";
  if (normalized.startsWith("/players")) return "Players";

  return null;
}
