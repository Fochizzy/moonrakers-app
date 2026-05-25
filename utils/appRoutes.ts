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
  roster: "/add-players",
  playerDirectory: "/player-profile",
  playerProfileDetail: "/player-profile/[playerId]",
  playerCards: "/player-cards",
  game: "/game",
  gameSetup: "/game-setup",
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
  ids?: string[];
  setup?: boolean;
}) {
  const ids = (input?.ids ?? []).map((id) => String(id).trim()).filter(Boolean);
  const playerId = String(input?.playerId ?? "").trim();
  const compareId = String(input?.compareId ?? "").trim();

  return {
    pathname: APP_ROUTES.charts,
    params: {
      ...(playerId ? { playerId } : {}),
      ...(compareId ? { compareId } : {}),
      ...(ids.length ? { ids: ids.join(",") } : {}),
      ...(input?.setup ? { setup: "1" } : {}),
    },
  } as const;
}

export function buildHistoryRoute(input?: { intent?: "import" | null }) {
  return {
    pathname: APP_ROUTES.history,
    params: input?.intent ? { intent: input.intent } : undefined,
  } as const;
}

export function buildPlayerProfileRoute(playerId: string) {
  return {
    pathname: APP_ROUTES.playerProfileDetail,
    params: { playerId },
  } as const;
}

export function buildDefinitionsRoute(metric: string);
export function buildDefinitionsRoute(input: {
  metric?: string | null;
  category?: string | null;
});
export function buildDefinitionsRoute(
  input: string | { metric?: string | null; category?: string | null }
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

  return {
    pathname: APP_ROUTES.definitions,
    params: {
      ...(metric ? { metric } : {}),
      ...(category ? { category } : {}),
    },
  } as const;
}
