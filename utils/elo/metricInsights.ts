import type { EloMetricTab } from "./metricRegistry";

export type MetricInsight = {
  title: string;
  body: string;
};

export function buildMetricInsight(
  tab: EloMetricTab,
  playerName: string,
  leadLabel?: string
): MetricInsight {
  switch (tab) {
    case "Leaderboard":
      return {
        title: "Ladder Position",
        body: `${playerName} is being evaluated on current rating, peak rating, and confidence from game volume.`,
      };
    case "Momentum":
      return {
        title: "Form Read",
        body: leadLabel
          ? `${playerName}'s recent form is currently led by ${leadLabel.toLowerCase()}.`
          : `${playerName}'s recent form will populate as more data comes in.`,
      };
    case "Skills":
      return {
        title: "Skill Signal",
        body: leadLabel
          ? `${playerName}'s strongest skill signal right now is ${leadLabel.toLowerCase()}.`
          : `${playerName}'s skill profile will populate as more data comes in.`,
      };
    case "Context":
      return {
        title: "Context Read",
        body: `${playerName}'s contextual metrics reflect opponent difficulty and matchup pressure.`,
      };
    case "Projection":
      return {
        title: "Projection Read",
        body: `${playerName}'s projection blends expected win rate, forward pathing, and promotion odds.`,
      };
    default:
      return {
        title: "Insight",
        body: `${playerName}'s current metric profile is shown here.`,
      };
  }
}
