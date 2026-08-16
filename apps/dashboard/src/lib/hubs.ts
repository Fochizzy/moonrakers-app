import type { HubTile } from "@/components/ui/HubTileGrid";

/** Mirrors the analytics hub cards in the app's `utils/appHubs.ts`. */
export const ANALYTICS_HUB_TILES: HubTile[] = [
  {
    key: "compare",
    eyebrow: "Matchup",
    title: "Compare",
    description: "Head-to-head reads between two players or two groups.",
    bestFor: "rivalry reads",
    href: "/compare",
  },
  {
    key: "charts",
    eyebrow: "Browse",
    title: "Charts",
    description: "Question-first chart catalog across every tracked metric.",
    bestFor: "pattern reads",
    href: "/charts",
  },
  {
    key: "stats",
    eyebrow: "Summary",
    title: "Stats",
    description: "League totals, playstyle reads, and table correlations.",
    bestFor: "league totals",
    href: "/stats",
  },
  {
    key: "elo",
    eyebrow: "Trend",
    title: "ELO",
    description: "Ratings leaderboard, history, and matchup gaps.",
    bestFor: "ratings",
    href: "/elo",
  },
  {
    key: "insights",
    eyebrow: "Meta",
    title: "Insights",
    description: "Server-authored signals about how the table is trending.",
    bestFor: "signals",
    href: "/insights",
  },
];

/** Mirrors the players hub cards in the app's `utils/appHubs.ts`. */
export const PLAYERS_HUB_TILES: HubTile[] = [
  {
    key: "directory",
    eyebrow: "Browse",
    title: "Profiles",
    description: "Search every visible player and open their full intel read.",
    href: "/player-profile",
  },
  {
    key: "cards",
    eyebrow: "Gallery",
    title: "Player Cards",
    description: "Rating-ranked fleet cards with each player's record.",
    href: "/player-cards",
  },
  {
    key: "profile",
    eyebrow: "Account",
    title: "Your Profile",
    description: "The signed-in player's own profile and quick compare jump.",
    href: "/profile",
  },
];

/** Mirrors the bridge destinations on the app's hubs tab. */
export const BRIDGE_HUB_TILES: HubTile[] = [
  {
    key: "history",
    eyebrow: "Archive",
    title: "History",
    description: "Every finished game, with summaries and postgame trends.",
    bestFor: "past sessions",
    href: "/history",
  },
  {
    key: "analytics",
    eyebrow: "Data",
    title: "Data",
    description: "The analytics hub: compare, charts, stats, ELO, and insights.",
    bestFor: "league reads",
    href: "/analytics",
  },
  {
    key: "players",
    eyebrow: "Roster",
    title: "Profile",
    description: "People surfaces: directory, player cards, and your profile.",
    bestFor: "people surfaces",
    href: "/players",
  },
  {
    key: "definitions",
    eyebrow: "Reference",
    title: "Definitions",
    description: "How every published metric is calculated.",
    bestFor: "metric lookup",
    href: "/definitions",
  },
];
