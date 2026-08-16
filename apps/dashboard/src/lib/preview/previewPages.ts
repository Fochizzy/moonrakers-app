import { DASHBOARD_CHARTS } from "@/components/charts/chartCatalog";
import { PREVIEW_GAME_COUNT } from "@/components/preview/previewData";
import { formatCount } from "@/lib/formatNumber";
import {
  ANALYTICS_HUB_TILES,
  BRIDGE_HUB_TILES,
  PLAYERS_HUB_TILES,
} from "@/lib/hubs";
import type { PreviewStatFamily } from "@/lib/preview/previewCatalog";

export type PreviewPage = {
  /** What is actually on the page, in the order it is laid out. */
  highlights: string[];
  key: string;
  label: string;
  /** Written once in `lib/hubs.ts` so the preview cannot drift from the app. */
  summary: string;
  title: string;
  useFor: string;
};

/**
 * Hub copy is the app's own, so only the contents list is written here.
 * `bestFor` is missing on a couple of tiles because the signed-in hub does not
 * print one for them; the preview lays the cards out in a grid, so every card
 * needs the line or the grid goes ragged.
 */
function fromHub(
  tiles: typeof ANALYTICS_HUB_TILES,
  key: string,
  label: string,
  highlights: string[],
  useForFallback = "",
): PreviewPage | null {
  const tile = tiles.find((entry) => entry.key === key);
  if (!tile) {
    return null;
  }

  return {
    highlights,
    key: tile.key,
    label,
    summary: tile.description,
    title: tile.title,
    useFor: tile.bestFor ?? useForFallback,
  };
}

export function buildPreviewPages(
  families: PreviewStatFamily[],
): PreviewPage[] {
  const metricCount = families.reduce(
    (total, family) => total + family.metricCount,
    0,
  );

  return [
    fromHub(BRIDGE_HUB_TILES, "history", "Command", [
      `Every finished game, newest first — ${formatCount(PREVIEW_GAME_COUNT)} in this league.`,
      "Final standings, winner, and margin for each one.",
      "Opens into a per-game summary and its round-by-round trend.",
    ]),
    fromHub(ANALYTICS_HUB_TILES, "stats", "Analytics", [
      "Six tabs: Overview, Player, Playstyle, Correlations, Rivals, Games.",
      "League totals up top, then per-player detail for whoever is in focus.",
      "Turn-order splits by table size, and what correlates with winning.",
    ]),
    fromHub(ANALYTICS_HUB_TILES, "charts", "Analytics", [
      `${formatCount(DASHBOARD_CHARTS.length)} charts grouped by the question you are asking.`,
      "Each one takes a focus player, a rival, a metric, and a scope.",
      "Radar, ELO trend, assist network, heatmaps, replays, and more.",
    ]),
    fromHub(ANALYTICS_HUB_TILES, "compare", "Analytics", [
      "Two players, or two groups, on one shared metric set.",
      "Per-metric deltas so the gap is readable without arithmetic.",
      "Jumps straight from any player profile.",
    ]),
    fromHub(ANALYTICS_HUB_TILES, "elo", "Analytics", [
      "Rating leaderboard with peak, confidence, and recent form.",
      "Rating history per player, and the gap in any matchup.",
      "Ratings move on finishing position and on how the game was won.",
    ]),
    fromHub(ANALYTICS_HUB_TILES, "insights", "Analytics", [
      "Top signals the server writes from the whole sample.",
      "Rivalry records against every opponent you have faced.",
      "The assist network: who supports whom, and how much it is worth.",
    ]),
    fromHub(
      PLAYERS_HUB_TILES,
      "directory",
      "Players",
      [
        "Every visible player in one searchable list.",
        "Hero rating, headline cards, and tabbed metric detail.",
        "Recent games and a Moonrakers Intel summary per player.",
      ],
      "looking one player up",
    ),
    fromHub(
      PLAYERS_HUB_TILES,
      "cards",
      "Players",
      [
        "Rating-ranked cards, one per player.",
        "Each carries the record, production rate, and card art.",
      ],
      "a quick read on the whole table",
    ),
    fromHub(BRIDGE_HUB_TILES, "definitions", "Reference", [
      `${formatCount(metricCount)} metrics across ${formatCount(families.length)} families.`,
      "Every entry says how it is calculated and what it means.",
      "Terms cross-link, so one definition leads to the related ones.",
    ]),
  ].filter((page): page is PreviewPage => page !== null);
}
