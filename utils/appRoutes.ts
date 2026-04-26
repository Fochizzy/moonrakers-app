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

export function buildPlayerProfileRoute(playerId: string) {
  return {
    pathname: APP_ROUTES.playerProfileDetail,
    params: { playerId },
  } as const;
}
