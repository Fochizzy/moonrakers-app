import type { AppIconKey } from "@/utils/iconAccess";
import { APP_ROUTES, type AppRoute } from "@/utils/appRoutes";

export type HubCard = {
  key: string;
  title: string;
  description: string;
  route: AppRoute;
  iconKey?: AppIconKey | null;
  eyebrow?: string;
  bestFor?: string;
};

const ANALYTICS_HUB_CARDS: HubCard[] = [
  {
    key: "compare",
    title: "Compare",
    description: "Rivalries",
    route: APP_ROUTES.compare,
    iconKey: "damage",
    eyebrow: "Matchup",
    bestFor: "Rivalry reads",
  },
  {
    key: "charts",
    title: "Charts",
    description: "Question-first charts",
    route: APP_ROUTES.charts,
    iconKey: "ships",
    eyebrow: "Browse",
    bestFor: "Pattern reads",
  },
  {
    key: "stats",
    title: "Stats",
    description: "League totals",
    route: APP_ROUTES.stats,
    iconKey: "shield",
    eyebrow: "Summary",
    bestFor: "League totals",
  },
  {
    key: "elo",
    title: "ELO",
    description: "Ratings history",
    route: APP_ROUTES.elo,
    iconKey: "reactor",
    eyebrow: "Trend",
    bestFor: "Ratings",
  },
  {
    key: "insights",
    title: "Insights",
    description: "Meta signals",
    route: APP_ROUTES.insights,
    iconKey: "hazardDieHub",
    eyebrow: "Meta",
    bestFor: "Signals",
  },
];

const PLAYERS_HUB_CARDS: HubCard[] = [
  {
    key: "roster",
    title: "Roster",
    description: "Roster tools",
    route: APP_ROUTES.roster,
    iconKey: "addRemoves",
    eyebrow: "Manage",
    bestFor: "Editing your roster",
  },
  {
    key: "directory",
    title: "Profiles",
    description: "Player lookup",
    route: APP_ROUTES.playerDirectory,
    iconKey: "billBendo",
    eyebrow: "Browse",
    bestFor: "Player lookup",
  },
  {
    key: "cards",
    title: "Cards",
    description: "Card gallery",
    route: APP_ROUTES.playerCards,
    iconKey: "blueHub",
    eyebrow: "Gallery",
    bestFor: "Visual scanning",
  },
];

const BRIDGE_DESTINATIONS: HubCard[] = [
  {
    key: "history",
    title: "History",
    description: "Past sessions",
    route: APP_ROUTES.history,
    iconKey: "missionHub",
    eyebrow: "Archive",
    bestFor: "Past sessions",
  },
  {
    key: "analytics",
    title: "Analytics",
    description: "League reads",
    route: APP_ROUTES.analytics,
    iconKey: "moneyHub",
    eyebrow: "Data",
    bestFor: "League reads",
  },
  {
    key: "players",
    title: "Players",
    description: "Roster hub",
    route: APP_ROUTES.players,
    iconKey: "prestigeHub",
    eyebrow: "Roster",
    bestFor: "People surfaces",
  },
  {
    key: "definitions",
    title: "Definitions",
    description: "Metric lookup",
    route: APP_ROUTES.definitions,
    iconKey: "objectiveHub",
    eyebrow: "Reference",
    bestFor: "Metric lookup",
  },
];

function clone(cards: HubCard[]) {
  return cards.map((card) => ({ ...card }));
}

export function getAnalyticsHubCards() {
  return clone(ANALYTICS_HUB_CARDS);
}

export function getPlayersHubCards() {
  return clone(PLAYERS_HUB_CARDS);
}

export function getBridgeDestinations() {
  return clone(BRIDGE_DESTINATIONS);
}
