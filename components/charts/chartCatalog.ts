import type { ChartTone } from "./chartVisualSystem";
import { getMetricOrFallback } from "@/utils/metricMap";

export type ChartPreviewKind =
  | "radar"
  | "trend"
  | "scatter"
  | "matchup"
  | "elo"
  | "ranking"
  | "bar"
  | "heatmap"
  | "network"
  | "composition"
  | "replay"
  | "band";

export type ChartSectionKey = "profile" | "matchup" | "trends";

export type ChartCatalogKey =
  | "elo"
  | "prestige_over_time"
  | "efficiency_failure_scatter"
  | "radar"
  | "sparkline"
  | "head_to_head"
  | "rivalry_graph"
  | "line_chart"
  | "multi_line_chart"
  | "bump_chart"
  | "consistency_band"
  | "bar_chart"
  | "heatmap"
  | "relationship_graph"
  | "stacked_bar_chart"
  | "replay_chart";

export type ChartCatalogEntry = {
  key: ChartCatalogKey;
  title: string;
  hook: string;
  detailSubtitle: string;
  section: ChartSectionKey;
  tone: Exclude<ChartTone, "neutral" | "danger" | "warning">;
  bestFor: string[];
  preview: ChartPreviewKind;
  supportsMetric?: boolean;
  supportsCompare?: boolean;
  supportsIds?: boolean;
  hubVisible?: boolean;
  aliases?: string[];
};

export const CHART_SECTIONS: Array<{
  key: ChartSectionKey;
  title: string;
  subtitle: string;
}> = [
  {
    key: "profile",
    title: "Your Game",
    subtitle: "Personal reads and player-focused views.",
  },
  {
    key: "matchup",
    title: "Matchups",
    subtitle: "Direct rivalries, side-by-side reads, and personal trends.",
  },
  {
    key: "trends",
    title: "Table",
    subtitle: "Shared movement, rankings, and table-wide shifts.",
  },
];

export const CHART_CATALOG: ChartCatalogEntry[] = [
  {
    key: "radar",
    title: "Radar",
    hook: "See your strongest and weakest traits at a glance.",
    detailSubtitle: "Trait profile from tracked games.",
    section: "profile",
    tone: "accent",
    bestFor: ["profile", "traits"],
    preview: "radar",
    supportsCompare: true,
  },
  {
    key: "consistency_band",
    title: "Consistency",
    hook: "Spot who stays steady and who swings big from game to game.",
    detailSubtitle: "Median and range by player.",
    section: "profile",
    tone: "green",
    bestFor: ["consistency", "stability"],
    preview: "band",
    supportsMetric: true,
    supportsIds: true,
  },
  {
    key: "elo",
    title: "ELO",
    hook: "Track who is rising in the rating race and who owns the board.",
    detailSubtitle: "Rating history across tracked games.",
    section: "profile",
    tone: "blue",
    bestFor: ["ranking", "trend"],
    preview: "elo",
    supportsIds: true,
  },
  {
    key: "stacked_bar_chart",
    title: "Stacked Bar",
    hook: "Break each performance into the pieces that built the result.",
    detailSubtitle: "Metric composition by player.",
    section: "profile",
    tone: "blue",
    bestFor: ["composition", "comparison"],
    preview: "composition",
    supportsIds: true,
  },
  {
    key: "relationship_graph",
    title: "Assist Network",
    hook: "See who assists whom across exact table combinations.",
    detailSubtitle: "Directed assist flow across the filtered sample.",
    section: "profile",
    tone: "blue",
    bestFor: ["support", "network"],
    preview: "network",
    supportsIds: true,
    aliases: ["relationship-graph", "assist_network_overview"],
  },
  {
    key: "head_to_head",
    title: "Head-to-Head",
    hook: "See who actually wins the matchup and where momentum changed.",
    detailSubtitle: "Two-player matchup across shared games.",
    section: "matchup",
    tone: "blue",
    bestFor: ["matchup", "momentum"],
    preview: "matchup",
    supportsCompare: true,
  },
  {
    key: "rivalry_graph",
    title: "Rivalry Graph",
    hook: "Turn a rivalry into a visual story of tension and edge.",
    detailSubtitle: "Rivalry view for the selected player.",
    section: "matchup",
    tone: "accent",
    bestFor: ["rivalry", "matchup"],
    preview: "matchup",
    supportsCompare: true,
  },
  {
    key: "sparkline",
    title: "Sparkline",
    hook: "Check whether a chosen stat is climbing, fading, or holding steady.",
    detailSubtitle: "One-player trend for the active metric.",
    section: "matchup",
    tone: "green",
    bestFor: ["trend", "form"],
    preview: "trend",
    supportsMetric: true,
    supportsCompare: true,
  },
  {
    key: "line_chart",
    title: "Line Chart",
    hook: "Follow the pace of a chosen metric across the selected table.",
    detailSubtitle: "Metric trend across tracked games.",
    section: "trends",
    tone: "green",
    bestFor: ["trend", "comparison"],
    preview: "trend",
    supportsMetric: true,
    supportsIds: true,
    aliases: ["line", "multi_line_chart", "multi-line-chart", "multi-line"],
  },
  {
    key: "prestige_over_time",
    title: "Prestige Over Time",
    hook: "See how prestige builds across your tracked games without changing the metric.",
    detailSubtitle: "Prestige progression across tracked games.",
    section: "profile",
    tone: "green",
    bestFor: ["prestige", "trend"],
    preview: "trend",
    supportsIds: true,
  },
  {
    key: "bump_chart",
    title: "Bump Chart",
    hook: "Watch who climbed and who slipped in rank from game to game.",
    detailSubtitle: "Rank by game for the selected metric.",
    section: "trends",
    tone: "blue",
    bestFor: ["ranking", "movement"],
    preview: "ranking",
    supportsMetric: true,
    supportsIds: true,
  },
  {
    key: "bar_chart",
    title: "Bar Chart",
    hook: "Compare the latest snapshot side by side without reading a timeline.",
    detailSubtitle: "Latest metric comparison.",
    section: "trends",
    tone: "blue",
    bestFor: ["snapshot", "comparison"],
    preview: "bar",
    supportsMetric: true,
    supportsIds: true,
    aliases: ["bar"],
  },
  {
    key: "heatmap",
    title: "Heatmap",
    hook: "Find the hottest runs, coolest patches, and most stable rows fast.",
    detailSubtitle: "Metric intensity by round and game.",
    section: "trends",
    tone: "accent",
    bestFor: ["intensity", "consistency"],
    preview: "heatmap",
    supportsMetric: true,
    supportsIds: true,
  },
  {
    key: "efficiency_failure_scatter",
    title: "Efficiency vs Failure",
    hook: "See who converts cleanly and who carries more failure risk across the sample.",
    detailSubtitle: "Average efficiency versus failures across tracked games.",
    section: "trends",
    tone: "accent",
    bestFor: ["efficiency", "risk"],
    preview: "scatter",
    supportsIds: true,
    aliases: ["efficiency-failure-scatter"],
  },
  {
    key: "multi_line_chart",
    title: "Multi-Line",
    hook: "Legacy alias for the shared line comparison view.",
    detailSubtitle: "Trend comparison across tracked games.",
    section: "trends",
    tone: "green",
    bestFor: ["trend", "comparison"],
    preview: "trend",
    supportsMetric: true,
    supportsIds: true,
    hubVisible: false,
    aliases: ["multi_line_chart", "multi-line-chart", "multi-line"],
  },
  {
    key: "replay_chart",
    title: "Replay Chart",
    hook: "Step through how a metric unfolded across the sample.",
    detailSubtitle: "Metric replay across the sample.",
    section: "trends",
    tone: "green",
    bestFor: ["replay", "trend"],
    preview: "replay",
    supportsMetric: true,
    supportsIds: true,
    hubVisible: false,
  },
];

const FOCUS_PLAYER_TOGGLE_KEYS = new Set<ChartCatalogKey>([
  "radar",
  "elo",
  "sparkline",
  "head_to_head",
  "rivalry_graph",
]);

export function resolveChartCatalogEntry(chartKey?: string | null) {
  const normalized = String(chartKey ?? "")
    .trim()
    .toLowerCase();

  return (
    CHART_CATALOG.find(
      (entry) =>
        entry.key === normalized ||
        (entry.aliases ?? []).some((alias) => alias === normalized)
    ) ?? CHART_CATALOG[0]!
  );
}

export function supportsChartFocusPlayerToggle(chartKey?: string | null) {
  return FOCUS_PLAYER_TOGGLE_KEYS.has(resolveChartCatalogEntry(chartKey).key);
}

export function supportsChartScopePlayerToggle(chartKey?: string | null) {
  return resolveChartCatalogEntry(chartKey).supportsIds === true;
}

export function canAdjustChartFromHub(chartKey?: string | null) {
  return resolveChartCatalogEntry(chartKey).hubVisible !== false;
}

export function getVisibleChartCatalog() {
  return CHART_CATALOG.filter((entry) => entry.hubVisible !== false);
}

export function normalizeChartHubSelection(chartKey?: string | null) {
  const entry = resolveChartCatalogEntry(chartKey);
  if (entry.hubVisible !== false) return entry;
  return getVisibleChartCatalog()[0] ?? entry;
}

export function getChartsForSection(section: ChartSectionKey) {
  return getVisibleChartCatalog().filter((entry) => entry.section === section);
}

type FeaturedTakeawayArgs = {
  chartKey: string;
  selectedPlayerName?: string | null;
  comparePlayerName?: string | null;
  scopedCount?: number;
  metricKey?: string | null;
};

export function buildFeaturedChartTakeaway({
  chartKey,
  selectedPlayerName: _selectedPlayerName,
  comparePlayerName: _comparePlayerName,
  scopedCount = 0,
  metricKey,
}: FeaturedTakeawayArgs) {
  const entry = resolveChartCatalogEntry(chartKey);
  const metric = getMetricOrFallback(String(metricKey || "totalPrestige"));
  const scopeText = scopedCount > 0 ? `${scopedCount} selected player${scopedCount === 1 ? "" : "s"}` : "the selected table";

  switch (entry.key) {
    case "radar":
      return "Select a player to see a strength-versus-weakness profile.";
    case "sparkline":
      return `Select a player to see whether they are trending up or down in ${metric.label.toLowerCase()}.`;
    case "consistency_band":
      return `See who stays steady and who swings wide in ${metric.label.toLowerCase()}.`;
    case "head_to_head":
      return "Select two players to see who usually comes out ahead.";
    case "rivalry_graph":
      return "Select two players and see their rivalry story.";
    case "elo":
      return `Select a player to see where they sit in the rating race across ${scopeText}.`;
    case "prestige_over_time":
      return "Track how prestige climbs across your selected sample with the shared line-style view.";
    case "line_chart":
    case "multi_line_chart":
      return `Track ${metric.label.toLowerCase()} across ${scopeText} and spot the pace-setter.`;
    case "bump_chart":
      return "Watch who climbed and who slipped in the ranking race from game to game.";
    case "bar_chart":
      return `Compare the latest ${metric.label.toLowerCase()} snapshot side by side.`;
    case "heatmap":
      return `Spot the hottest runs and coldest patches in ${metric.label.toLowerCase()}.`;
    case "efficiency_failure_scatter":
      return "See which players balance high efficiency with low failure pressure across the current sample.";
    case "relationship_graph":
      return scopedCount >= 2
        ? `See who assists whom when this exact ${scopeText} plays together.`
        : "See who assists whom across the full sample, or narrow to an exact table.";
    case "stacked_bar_chart":
      return "Break each player's result into the pieces that built it.";
    case "replay_chart":
      return `Replay how ${metric.label.toLowerCase()} unfolded across the sample.`;
    default:
      return entry.hook;
  }
}
