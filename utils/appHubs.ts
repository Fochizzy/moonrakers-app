import type { AppIconKey } from "@/utils/iconAccess";
import { APP_ROUTES, type AppRoute } from "@/utils/appRoutes";

export type HubCard = {
  key: string;
  title: string;
  description: string;
  route: AppRoute;
  iconKey?: AppIconKey | null;
  layout?: "graphic" | "text" | "graphic-horizontal";
  fullWidth?: boolean;
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
    iconKey: "thruster",
    eyebrow: "Meta",
    bestFor: "Signals",
  },
];

const PLAYERS_HUB_CARDS: HubCard[] = [
  {
    key: "roster",
    title: "Roster",
    description: "",
    route: APP_ROUTES.roster,
    iconKey: "addRemoves",
    eyebrow: "Manage",
  },
  {
    key: "directory",
    title: "Profiles",
    description: "",
    route: APP_ROUTES.playerDirectory,
    iconKey: "billBendo",
    eyebrow: "Browse",
  },
  {
    key: "cards",
    title: "Player Card",
    description: "",
    route: APP_ROUTES.playerCards,
    iconKey: "blueHub",
    eyebrow: "Gallery",
  },
];

const BRIDGE_DESTINATIONS: HubCard[] = [
  {
    key: "history",
    title: "History",
    description: "",
    route: APP_ROUTES.history,
    iconKey: "missionHub",
    eyebrow: "Archive",
    bestFor: "Past sessions",
  },
  {
    key: "analytics",
    title: "Data",
    description: "",
    route: APP_ROUTES.analytics,
    iconKey: "moneyHub",
    eyebrow: "Data",
    bestFor: "League reads",
  },
  {
    key: "players",
    title: "Players",
    description: "",
    route: APP_ROUTES.players,
    iconKey: "prestigeHub",
    eyebrow: "Roster",
    bestFor: "People surfaces",
  },
  {
    key: "definitions",
    title: "Definitions",
    description: "",
    route: APP_ROUTES.definitions,
    iconKey: "objectiveHub",
    eyebrow: "Reference",
    bestFor: "Metric lookup",
  },
  {
    key: "profile-management",
    title: "Profile Management",
    description: "Profile Picture",
    route: APP_ROUTES.roster,
    iconKey: "billBendo",
    layout: "graphic-horizontal",
    fullWidth: true,
    eyebrow: "Account",
    bestFor: "Profile setup",
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
