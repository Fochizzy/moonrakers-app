export type DashboardChartSectionKey = "matchup" | "profile" | "trends";

export type DashboardChartEntry = {
  aliases?: string[];
  detailSubtitle: string;
  hook: string;
  key: string;
  section: DashboardChartSectionKey;
  title: string;
};

export const DASHBOARD_CHART_SECTIONS: Array<{
  key: DashboardChartSectionKey;
  subtitle: string;
  title: string;
}> = [
  {
    key: "profile",
    title: "Your Game",
    subtitle: "Personal reads and player-focused views.",
  },
  {
    key: "matchup",
    title: "Matchups",
    subtitle: "Direct rivalries, side-by-side reads, and focused compare workflows.",
  },
  {
    key: "trends",
    title: "Table",
    subtitle: "Shared movement, timelines, and table-wide graph reads.",
  },
];

export const DASHBOARD_CHARTS: DashboardChartEntry[] = [
  {
    key: "radar",
    title: "Radar",
    hook: "See your strongest and weakest traits at a glance.",
    detailSubtitle: "Trait profile from tracked games.",
    section: "profile",
  },
  {
    key: "elo",
    title: "ELO",
    hook: "Track who is rising in the rating race and who owns the board.",
    detailSubtitle: "Rating history across tracked games.",
    section: "profile",
  },
  {
    key: "prestige_over_time",
    title: "Prestige Over Time",
    hook: "Watch prestige build across the sample without changing the metric.",
    detailSubtitle: "Prestige progression across tracked games.",
    section: "profile",
  },
  {
    key: "relationship_graph",
    title: "Assist Network",
    hook: "See who assists whom across exact table combinations.",
    detailSubtitle: "Directed assist flow across the filtered sample.",
    section: "profile",
    aliases: ["relationship-graph", "assist_network_overview"],
  },
  {
    key: "compare",
    title: "Compare",
    hook: "Direct side-by-side read driven by the shared compare contract.",
    detailSubtitle: "Focus player versus rival.",
    section: "matchup",
  },
  {
    key: "head_to_head",
    title: "Head-to-Head",
    hook: "See who actually wins the matchup and where momentum changed.",
    detailSubtitle: "Two-player matchup across shared games.",
    section: "matchup",
  },
  {
    key: "rivalry_graph",
    title: "Rivalry Graph",
    hook: "Turn a rivalry into a visual story of tension and edge.",
    detailSubtitle: "Rivalry view for the selected player.",
    section: "matchup",
  },
  {
    key: "sparkline",
    title: "Sparkline",
    hook: "Check whether a chosen stat is climbing, fading, or holding steady.",
    detailSubtitle: "One-player trend for the active metric.",
    section: "matchup",
  },
  {
    key: "line_chart",
    title: "Line Chart",
    hook: "Follow the pace of a chosen metric across the selected table.",
    detailSubtitle: "Metric trend across tracked games.",
    section: "trends",
    aliases: ["line", "multi_line_chart", "multi-line-chart", "multi-line"],
  },
  {
    key: "bar_chart",
    title: "Bar Chart",
    hook: "Compare the latest snapshot side by side without reading a full timeline.",
    detailSubtitle: "Latest metric comparison.",
    section: "trends",
    aliases: ["bar"],
  },
  {
    key: "bump_chart",
    title: "Bump Chart",
    hook: "Watch who climbed and who slipped in rank from game to game.",
    detailSubtitle: "Rank by game for the selected metric.",
    section: "trends",
  },
  {
    key: "heatmap",
    title: "Heatmap",
    hook: "Find the hottest runs, coolest patches, and most stable rows fast.",
    detailSubtitle: "Metric intensity by round and game.",
    section: "trends",
  },
  {
    key: "efficiency_failure_scatter",
    title: "Efficiency vs Failure",
    hook: "See who converts cleanly and who carries more failure risk.",
    detailSubtitle: "Average efficiency versus failures across tracked games.",
    section: "trends",
    aliases: ["efficiency-failure-scatter"],
  },
  {
    key: "replay_chart",
    title: "Replay Chart",
    hook: "Step through how a metric unfolded across the sample.",
    detailSubtitle: "Metric replay across the sample.",
    section: "trends",
    aliases: ["replay"],
  },
];

export function normalizeDashboardChartKey(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "radar";
  }

  const entry = DASHBOARD_CHARTS.find(
    (chart) =>
      chart.key === normalized ||
      (chart.aliases ?? []).some((alias) => alias === normalized),
  );

  return entry?.key ?? normalized;
}

export function getDashboardChartEntry(value: string | null | undefined) {
  const normalized = normalizeDashboardChartKey(value);
  return (
    DASHBOARD_CHARTS.find((entry) => entry.key === normalized) ??
    DASHBOARD_CHARTS[0]
  );
}

export function getDashboardChartsForSection(section: DashboardChartSectionKey) {
  return DASHBOARD_CHARTS.filter((entry) => entry.section === section);
}
