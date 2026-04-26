import type { AppIconKey } from "@/utils/iconAccess";
import { APP_ROUTES, type AppRoute } from "@/utils/appRoutes";

export type HubCard = {
  key: string;
  title: string;
  description: string;
  route: AppRoute;
  iconKey: AppIconKey;
  eyebrow?: string;
  bestFor?: string;
};

const ANALYTICS_HUB_CARDS: HubCard[] = [
  {
    key: "compare",
    title: "Compare",
    description: "Head-to-head and rivalry reads.",
    route: APP_ROUTES.compare,
    iconKey: "damage",
    eyebrow: "Matchup",
    bestFor: "Rivalry reads",
  },
  {
    key: "charts",
    title: "Charts",
    description: "Question-first chart browser.",
    route: APP_ROUTES.charts,
    iconKey: "ships",
    eyebrow: "Browse",
    bestFor: "Pattern reads",
  },
  {
    key: "stats",
    title: "Stats",
    description: "League summaries and breakdowns.",
    route: APP_ROUTES.stats,
    iconKey: "shield",
    eyebrow: "Summary",
    bestFor: "League totals",
  },
  {
    key: "elo",
    title: "ELO",
    description: "Ratings and ranking history.",
    route: APP_ROUTES.elo,
    iconKey: "reactor",
    eyebrow: "Trend",
    bestFor: "Ratings",
  },
  {
    key: "insights",
    title: "Insights",
    description: "Meta trends and table signals.",
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
    description: "Add players, manage saved groups, and keep the card/color identity flow in one working surface.",
    route: APP_ROUTES.roster,
    iconKey: "addRemoves",
    eyebrow: "Manage",
    bestFor: "Editing your roster",
  },
  {
    key: "directory",
    title: "Profiles",
    description: "Browse the player directory and jump straight into a specific profile or matchup context.",
    route: APP_ROUTES.playerDirectory,
    iconKey: "billBendo",
    eyebrow: "Browse",
    bestFor: "Player lookup",
  },
  {
    key: "cards",
    title: "Cards",
    description: "Open the gallery-style player cards view when you want a quick visual scan of the whole table.",
    route: APP_ROUTES.playerCards,
    iconKey: "playerCard",
    eyebrow: "Gallery",
    bestFor: "Visual scanning",
  },
];

const BRIDGE_DESTINATIONS: HubCard[] = [
  {
    key: "history",
    title: "History",
    description: "Replays and backups.",
    route: APP_ROUTES.history,
    iconKey: "miss",
    eyebrow: "Archive",
    bestFor: "Past sessions",
  },
  {
    key: "analytics",
    title: "Analytics",
    description: "Charts and league reads.",
    route: APP_ROUTES.analytics,
    iconKey: "shield",
    eyebrow: "Data",
    bestFor: "League reads",
  },
  {
    key: "players",
    title: "Players",
    description: "Roster and profiles.",
    route: APP_ROUTES.players,
    iconKey: "orangePerson",
    eyebrow: "Roster",
    bestFor: "People surfaces",
  },
  {
    key: "definitions",
    title: "Definitions",
    description: "Metric glossary.",
    route: APP_ROUTES.definitions,
    iconKey: "thruster",
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
