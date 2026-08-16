import { getChartMetricValue } from "@/utils/chartMetricValue";
import { getMetricOrFallback } from "@/utils/metricMap";
import type {
  RadarStats,
  Relationships,
  SnapshotPoint,
  StackedRow,
  StorePlayer,
} from "@/utils/charts";
import { buildHeadToHeadVisualModel } from "./headToHeadModel";
import { buildRelationshipInsightModel } from "./relationshipGraphModel";
import { buildBumpChartModel } from "./bumpChartModel";
import { buildConsistencyBandModel } from "./consistencyBandModel";
import type { ChartTone } from "./chartVisualSystem";

type SimplePlayer = Pick<StorePlayer, "id" | "name" | "color">;

export type ChartProofCard = {
  label: string;
  value: string;
  helper?: string;
  tone?: ChartTone;
};

export const CHART_DETAIL_SECTION_ORDER = [
  "takeaway",
  "proof",
  "chart",
  "controls",
] as const;

type ChartPageModelArgs = {
  chartKey: string;
  hasData: boolean;
  gamesCount: number;
  playersCount: number;
  scopedPlayers?: SimplePlayer[];
  selectedPlayer?: SimplePlayer | null;
  comparePlayer?: SimplePlayer | null;
  metricKey?: string | null;
  snapshots?: SnapshotPoint[];
  radarPrimary?: RadarStats;
  relationships?: Relationships;
  graphMode?: string | null;
  stackedRows?: StackedRow[];
};

type MetricRow = {
  player: SimplePlayer;
  value: number;
};

function playerName(
  player?: { id?: string; name?: string | null } | null,
) {
  return String(player?.name || "Unknown").trim() || "Unknown";
}

function pluralize(value: number, label: string) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function round(value: number, digits = 1) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function stdDev(values: number[]) {
  const clean = values.filter(Number.isFinite);
  if (clean.length <= 1) return 0;
  const avg = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const variance =
    clean.reduce((sum, value) => sum + (value - avg) ** 2, 0) / clean.length;
  return Math.sqrt(variance);
}

function formatSigned(value: number, digits = 1) {
  const rounded = round(value, digits);
  const fixed = digits > 0 ? rounded.toFixed(digits) : Math.round(rounded).toString();
  return `${rounded > 0 ? "+" : ""}${fixed}`;
}

function formatMetricValue(metricKey: string, value: number) {
  const metric = getMetricOrFallback(metricKey);

  if (metric.format === "percent") {
    return `${round(value, 1).toFixed(1)}%`;
  }

  if (metric.format === "elo") {
    return `${Math.round(value)}`;
  }

  if (metric.format === "signed") {
    return formatSigned(value, Math.abs(value) >= 100 ? 0 : metric.decimals ?? 1);
  }

  if (Math.abs(value) >= 100) {
    return `${Math.round(value)}`;
  }

  return round(value, metric.decimals ?? 1).toFixed(metric.decimals ?? 1);
}

function buildLatestMetricRows(
  snapshots: SnapshotPoint[],
  scopedPlayers: SimplePlayer[],
  metricKey: string
): MetricRow[] {
  const latestSnapshot = snapshots[snapshots.length - 1]?.snapshot ?? {};

  return scopedPlayers
    .map((player) => ({
      player,
      value: getChartMetricValue(latestSnapshot[player.id], metricKey),
    }))
    .sort((left, right) => right.value - left.value);
}

function buildSeriesValues(
  snapshots: SnapshotPoint[],
  playerId: string,
  metricKey: string
) {
  return snapshots.map((snapshot) =>
    getChartMetricValue(snapshot?.snapshot?.[playerId], metricKey)
  );
}

function getStackedRowTotal(row: StackedRow) {
  return (row.segments ?? []).reduce((sum, segment) => sum + round(segment.value ?? 0, 4), 0);
}

function getDominantStackedSegment(row: StackedRow) {
  return [...(row.segments ?? [])].sort((left, right) => right.value - left.value)[0] ?? null;
}

function buildStackedSummaryRows(
  scopedPlayers: SimplePlayer[],
  stackedRows: StackedRow[]
) {
  const scopedPlayersById = new Map(
    scopedPlayers.map((player) => [String(player.id), player] as const)
  );

  return (stackedRows ?? [])
    .map((row) => ({
      player:
        scopedPlayersById.get(String(row.id)) ?? {
          id: String(row.id),
          name: row.label || "Unknown",
          color: row.color,
        },
      total: getStackedRowTotal(row),
      dominantSegment: getDominantStackedSegment(row),
    }))
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total);
}

function buildHeatmapSummaryRows(
  snapshots: SnapshotPoint[],
  scopedPlayers: SimplePlayer[],
  metricKey: string
) {
  return scopedPlayers.map((player) => {
    const values = buildSeriesValues(snapshots, player.id, metricKey);
    return {
      player,
      average: values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0,
      peak: values.length ? Math.max(...values) : 0,
      latest: values.length ? values[values.length - 1] : 0,
      consistency: stdDev(values),
    };
  });
}

function buildMetricDrivenModel(args: ChartPageModelArgs) {
  const scopedPlayers = args.scopedPlayers ?? [];
  const metricKey = String(args.metricKey || "totalPrestige");
  const metric = getMetricOrFallback(metricKey);
  const latestRows = buildLatestMetricRows(args.snapshots ?? [], scopedPlayers, metricKey);
  const leader = latestRows[0];
  const leaderName = leader ? playerName(leader.player) : "No leader yet";

  return {
    takeaway: leader
      ? `${leaderName} leads the latest ${metric.label} readout across ${pluralize(
          scopedPlayers.length,
          "scoped player"
        )}.`
      : `Use this chart to read ${metric.label.toLowerCase()} across the scoped players.`,
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Scope",
        value: pluralize(scopedPlayers.length, "player"),
        helper: `${args.playersCount} available overall`,
        tone: "accent" as const,
      },
      {
        label: "Latest Leader",
        value: leaderName,
        helper: leader ? formatMetricValue(metricKey, leader.value) : "No sample yet",
        tone: "green" as const,
      },
      {
        label: "Metric",
        value: metric.label,
        helper: metric.description,
        tone: "neutral" as const,
      },
    ],
  };
}

function buildStackedBarModel(args: ChartPageModelArgs) {
  const scopedPlayers = args.scopedPlayers ?? [];
  const metricKey = String(args.metricKey || "totalPrestige");
  const metric = getMetricOrFallback(metricKey);
  const summaryRows = buildStackedSummaryRows(scopedPlayers, args.stackedRows ?? []);
  const leader = summaryRows[0] ?? null;
  const grandTotal = summaryRows.reduce((sum, row) => sum + row.total, 0);
  const leaderShare =
    leader && grandTotal > 0 ? Math.round((leader.total / grandTotal) * 100) : 0;

  return {
    takeaway: leader
      ? `${playerName(leader.player)} leads ${metric.label.toLowerCase()} composition with ${formatMetricValue(
          metricKey,
          leader.total
        )}, representing ${leaderShare}% of the visible total.`
      : `Use this chart to compare ${metric.label.toLowerCase()} composition across the scoped players.`,
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Scope",
        value: pluralize(scopedPlayers.length, "player"),
        helper: `${args.playersCount} available overall`,
        tone: "accent" as const,
      },
      {
        label: "Top Total",
        value: leader ? playerName(leader.player) : "No leader yet",
        helper: leader
          ? formatMetricValue(metricKey, leader.total)
          : "No sample yet",
        tone: "green" as const,
      },
      {
        label: "Leader Share",
        value: `${leaderShare}%`,
        helper: leader?.dominantSegment
          ? `${leader.dominantSegment.label} is the biggest source`
          : metric.description,
        tone: "neutral" as const,
      },
    ],
  };
}

function buildHeatmapModel(args: ChartPageModelArgs) {
  const scopedPlayers = args.scopedPlayers ?? [];
  const metricKey = String(args.metricKey || "totalPrestige");
  const metric = getMetricOrFallback(metricKey);
  const summaries = buildHeatmapSummaryRows(
    args.snapshots ?? [],
    scopedPlayers,
    metricKey
  );
  const hottest =
    [...summaries].sort((left, right) => right.average - left.average)[0] ?? null;
  const mostStable =
    [...summaries].sort((left, right) => left.consistency - right.consistency)[0] ??
    null;

  return {
    takeaway:
      hottest && mostStable
        ? `${playerName(hottest.player)} runs hottest in ${metric.label.toLowerCase()}, while ${playerName(
            mostStable.player
          )} is the steadiest.`
        : `Use this heatmap to compare ${metric.label.toLowerCase()} intensity across the scoped players.`,
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Hottest",
        value: hottest ? playerName(hottest.player) : "None",
        helper: hottest
          ? `${formatMetricValue(metricKey, hottest.average)} average`
          : "No sample yet",
        tone: "accent" as const,
      },
      {
        label: "Most Stable",
        value: mostStable ? playerName(mostStable.player) : "None",
        helper: mostStable
          ? `sigma ${round(mostStable.consistency, 2).toFixed(2)}`
          : "No sample yet",
        tone: "green" as const,
      },
      {
        label: "Colors",
        value: "Green / Red",
        helper: "Green is hotter, red is cooler, pale cells are neutral",
        tone: "neutral" as const,
      },
    ],
  };
}

function buildEfficiencyFailureScatterModel(args: ChartPageModelArgs) {
  const scopedPlayers = args.scopedPlayers ?? [];
  const snapshots = args.snapshots ?? [];

  const summaryRows = scopedPlayers
    .map((player) => {
      const failureValues = buildSeriesValues(snapshots, player.id, "failures");
      const efficiencyValues = buildSeriesValues(snapshots, player.id, "efficiency");

      const failureAverage = failureValues.length
        ? failureValues.reduce((sum, value) => sum + value, 0) / failureValues.length
        : 0;
      const efficiencyAverage = efficiencyValues.length
        ? efficiencyValues.reduce((sum, value) => sum + value, 0) / efficiencyValues.length
        : 0;

      return {
        player,
        failureAverage,
        efficiencyAverage,
        balanceScore: efficiencyAverage - failureAverage,
      };
    })
    .filter(
      (row) =>
        Number.isFinite(row.failureAverage) && Number.isFinite(row.efficiencyAverage)
    );

  const sharpest =
    [...summaryRows].sort(
      (left, right) =>
        right.efficiencyAverage - left.efficiencyAverage ||
        left.failureAverage - right.failureAverage
    )[0] ?? null;
  const safest =
    [...summaryRows].sort(
      (left, right) =>
        left.failureAverage - right.failureAverage ||
        right.efficiencyAverage - left.efficiencyAverage
    )[0] ?? null;
  const bestBalance =
    [...summaryRows].sort((left, right) => right.balanceScore - left.balanceScore)[0] ??
    null;

  return {
    takeaway:
      sharpest && safest
        ? `${playerName(sharpest.player)} runs the highest efficiency, while ${playerName(
            safest.player
          )} keeps failures the lowest across the scoped sample.`
        : "Use this chart to compare efficiency versus failure pressure across the scoped players.",
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Scope",
        value: pluralize(scopedPlayers.length, "player"),
        helper: `${args.playersCount} available overall`,
        tone: "accent" as const,
      },
      {
        label: "Top Efficiency",
        value: sharpest ? playerName(sharpest.player) : "None",
        helper: sharpest
          ? round(sharpest.efficiencyAverage, 2).toFixed(2)
          : "No sample yet",
        tone: "green" as const,
      },
      {
        label: "Best Balance",
        value: bestBalance ? playerName(bestBalance.player) : "None",
        helper: bestBalance
          ? `${round(bestBalance.efficiencyAverage, 2).toFixed(2)} eff • ${round(bestBalance.failureAverage, 2).toFixed(2)} fail`
          : "No sample yet",
        tone: "neutral" as const,
      },
    ],
  };
}

function buildRadarModel(args: ChartPageModelArgs) {
  const radarPrimary = args.radarPrimary;
  const selected = playerName(args.selectedPlayer);

  if (!radarPrimary) {
    return {
      takeaway: `Radar will profile ${selected} once tracked games are available.`,
      proofCards: [
        { label: "Focus", value: selected, tone: "accent" as const },
        { label: "Games", value: `${args.gamesCount}`, tone: "blue" as const },
      ],
    };
  }

  const traitEntries = Object.entries(radarPrimary).sort((left, right) => right[1] - left[1]);
  const strongest = traitEntries[0];
  const weakest = traitEntries[traitEntries.length - 1];
  const labelMap: Record<string, string> = {
    finisher: "Finisher",
    starter: "Starter",
    supporter: "Supporter",
    receiver: "Receiver",
    stability: "Stability",
    efficiency: "Efficiency",
    risk: "Risk",
    conversion: "Conversion",
  };

  return {
    takeaway: `${selected} profiles strongest in ${String(
      labelMap[strongest?.[0] ?? strongest?.[0]]
    ).toLowerCase()} across ${pluralize(args.gamesCount, "tracked game")}.`,
    proofCards: [
      { label: "Focus", value: selected, tone: "accent" as const },
      {
        label: "Strongest Trait",
        value: labelMap[strongest?.[0] ?? "finisher"] ?? "Top Trait",
        helper: `${Math.round((strongest?.[1] ?? 0) * 100)}%`,
        tone: "green" as const,
      },
      {
        label: "Weakest Trait",
        value: labelMap[weakest?.[0] ?? "risk"] ?? "Weakest Trait",
        helper: `${Math.round((weakest?.[1] ?? 0) * 100)}%`,
        tone: "blue" as const,
      },
      {
        label: "Sample",
        value: pluralize(args.gamesCount, "game"),
        helper: "Unified live and imported history",
        tone: "neutral" as const,
      },
    ],
  };
}

function buildSparklineModel(args: ChartPageModelArgs) {
  const metricKey = String(args.metricKey || "totalPrestige");
  const metric = getMetricOrFallback(metricKey);
  const selected = args.selectedPlayer;
  const compare = args.comparePlayer;
  const snapshots = args.snapshots ?? [];

  if (!selected || !snapshots.length) {
    return {
      takeaway: `Sparkline will summarize one player's ${metric.label.toLowerCase()} once games are available.`,
      proofCards: [
        { label: "Metric", value: metric.label, tone: "accent" as const },
        { label: "Games", value: `${args.gamesCount}`, tone: "blue" as const },
      ],
    };
  }

  const selectedSeries = buildSeriesValues(snapshots, selected.id, metricKey);
  const current = selectedSeries[selectedSeries.length - 1] ?? 0;
  const change = current - (selectedSeries[0] ?? current);
  const compareCurrent =
    compare != null
      ? buildSeriesValues(snapshots, compare.id, metricKey).slice(-1)[0] ?? 0
      : null;

  return {
    takeaway: `${playerName(selected)} is ${
      change > 0.01 ? "trending up" : change < -0.01 ? "sliding back" : "holding steady"
    } in ${metric.label.toLowerCase()} over the current sample.`,
    proofCards: [
      { label: "Focus", value: playerName(selected), tone: "accent" as const },
      {
        label: "Current",
        value: formatMetricValue(metricKey, current),
        helper: metric.label,
        tone: "green" as const,
      },
      {
        label: "Change",
        value: formatSigned(change, metric.decimals ?? 1),
        helper: "First sample to latest",
        tone: change >= 0 ? ("blue" as const) : ("danger" as const),
      },
      compare
        ? {
            label: "Gap",
            value: formatSigned(current - (compareCurrent ?? 0), metric.decimals ?? 1),
            helper: `Vs ${playerName(compare)}`,
            tone: "neutral" as const,
          }
        : {
            label: "Games",
            value: `${args.gamesCount}`,
            helper: pluralize(args.gamesCount, "tracked game"),
            tone: "neutral" as const,
          },
    ],
  };
}

function buildRelationshipModel(args: ChartPageModelArgs) {
  const scopedPlayers = args.scopedPlayers ?? [];
  const relationships = args.relationships ?? {};
  const insight = buildRelationshipInsightModel(scopedPlayers, relationships);

  return {
    takeaway: insight.hub && insight.strongestLink && insight.netGiver
      ? `${playerName(insight.hub.player)} is the interaction hub, ${playerName(
          insight.netGiver.player
        )} gives more than they receive, and ${playerName(
          insight.strongestLink.from
        )} -> ${playerName(insight.strongestLink.to)} is the strongest link.`
      : "This graph is most useful when multiple players have shared assist history.",
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Hub",
        value: insight.hub ? playerName(insight.hub.player) : "None",
        helper: insight.hub
          ? `${round(insight.hub.value, 1).toFixed(1)} total involvement`
          : "No network yet",
        tone: "accent" as const,
      },
      {
        label: "Net Giver",
        value:
          insight.netGiver
            ? playerName(insight.netGiver.player)
            : "None",
        helper: insight.netGiver
          ? formatSigned(insight.netGiver.value, 1)
          : "No imbalance data",
        tone: "green" as const,
      },
      {
        label: "Strongest Link",
        value:
          insight.strongestLink
            ? `${playerName(insight.strongestLink.from)} -> ${playerName(
                insight.strongestLink.to
              )}`
            : "None",
        helper: insight.strongestLink
          ? `${round(insight.strongestLink.value, 1).toFixed(1)} weighted`
          : "No edge data",
        tone: "neutral" as const,
      },
    ],
  };
}

function buildHeadToHeadModel(args: ChartPageModelArgs) {
  const left = args.selectedPlayer;
  const right = args.comparePlayer;

  if (!left || !right) {
    return {
      takeaway: "Pick two players to compare their direct results.",
      proofCards: [
        { label: "Games", value: `${args.gamesCount}`, tone: "blue" as const },
      ],
    };
  }

  const summary = buildHeadToHeadVisualModel({
    players: [left, right],
    data: args.snapshots ?? [],
    playerId: left.id,
    compareId: right.id,
  });

  if (!summary) {
    return {
      takeaway: "Pick two players with shared games to compare their direct results.",
      proofCards: [
        {
          label: "Games",
          value: `${args.gamesCount}`,
          helper: pluralize(args.gamesCount, "tracked game"),
          tone: "blue" as const,
        },
      ],
    };
  }

  const record = `${summary.aWins}-${summary.bWins}`;
  const swingHelper = summary.swingLeaderName
    ? `Latest ${Math.min(3, summary.games)}-game window`
    : "No recent swing";
  const takeaway =
    summary.leaderTone === "tie"
      ? `${summary.playerAName} and ${summary.playerBName} are effectively even across ${pluralize(
          summary.games,
          "shared game"
        )}.`
      : summary.swingLeaderName &&
          summary.swingLeaderName !== summary.leaderName &&
          summary.currentRunLength >= 2
        ? `${summary.leaderName} leads ${record} overall, but ${summary.swingLeaderName} has the better recent run.`
        : `${summary.leaderName} leads ${record} across ${pluralize(
            summary.games,
            "shared game"
          )}.`;

  return {
    takeaway,
    proofCards: [
      {
        label: "Games",
        value: `${summary.games}`,
        helper: pluralize(summary.games, "shared game"),
        tone: "blue" as const,
      },
      {
        label: "Leader",
        value: summary.leaderName,
        helper:
          summary.ties > 0
            ? `${summary.ties} tied sample${summary.ties === 1 ? "" : "s"}`
            : "No tied samples",
        tone: "accent" as const,
      },
      {
        label: "Record",
        value: record,
        helper: `${summary.playerAName} vs ${summary.playerBName}`,
        tone: "green" as const,
      },
      {
        label: "Recent Swing",
        value: summary.swingLeaderName ?? "Even",
        helper: swingHelper,
        tone: "neutral" as const,
      },
    ],
  };
}

function buildBumpChartDetailModel(args: ChartPageModelArgs) {
  const scopedPlayers = args.scopedPlayers ?? [];
  const metricKey = String(args.metricKey || "totalPrestige");
  const metric = getMetricOrFallback(metricKey);
  const model = buildBumpChartModel({
    players: scopedPlayers,
    data: args.snapshots ?? [],
    metricKey,
  });

  const leader = model.leader;
  const climber = model.biggestClimber;

  return {
    takeaway:
      leader && climber
        ? climber.rankChange > 0
          ? `${leader.name} owns the latest lead, and ${climber.name} made the biggest climb in ${metric.label.toLowerCase()}.`
          : `${leader.name} holds the latest lead in ${metric.label.toLowerCase()}, with minimal rank movement across the sample.`
        : `Use this chart to track who climbed and who slipped in ${metric.label.toLowerCase()}.`,
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Leader",
        value: leader?.name ?? "None",
        helper: leader ? `Latest rank #${leader.latestRank}` : "No sample yet",
        tone: "accent" as const,
      },
      {
        label: "Biggest Climb",
        value: climber?.name ?? "None",
        helper:
          climber && climber.rankChange > 0
            ? `Up ${climber.rankChange} spot${climber.rankChange === 1 ? "" : "s"}`
            : "No upward movement yet",
        tone: "green" as const,
      },
      {
        label: "Metric",
        value: metric.label,
        helper: "Ranks are recalculated per game",
        tone: "neutral" as const,
      },
    ],
  };
}

function buildConsistencyBandDetailModel(args: ChartPageModelArgs) {
  const scopedPlayers = args.scopedPlayers ?? [];
  const metricKey = String(args.metricKey || "totalPrestige");
  const metric = getMetricOrFallback(metricKey);
  const model = buildConsistencyBandModel({
    players: scopedPlayers,
    data: args.snapshots ?? [],
    metricKey,
  });

  return {
    takeaway:
      model.mostStable && model.mostSwingy && model.medianLeader
        ? `${model.mostStable.name} is the steadiest ${metric.label.toLowerCase()} performer, ${model.mostSwingy.name} swings the most, and ${model.medianLeader.name} sets the median pace.`
        : `Use this chart to compare stability versus volatility in ${metric.label.toLowerCase()}.`,
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Most Stable",
        value: model.mostStable?.name ?? "None",
        helper: model.mostStable
          ? `sigma ${round(model.mostStable.deviation, 2).toFixed(2)}`
          : "No sample yet",
        tone: "green" as const,
      },
      {
        label: "Swingiest",
        value: model.mostSwingy?.name ?? "None",
        helper: model.mostSwingy
          ? `range ${round(model.mostSwingy.spread, 1).toFixed(1)}`
          : "No spread yet",
        tone: "accent" as const,
      },
      {
        label: "Median Leader",
        value: model.medianLeader?.name ?? "None",
        helper: model.medianLeader
          ? formatMetricValue(metricKey, model.medianLeader.median)
          : metric.label,
        tone: "neutral" as const,
      },
    ],
  };
}

function buildFallbackModel(args: ChartPageModelArgs) {
  return {
    takeaway: args.hasData
      ? `Use this chart to inspect ${pluralize(args.gamesCount, "tracked game")} across ${pluralize(
          (args.scopedPlayers ?? []).length || args.playersCount,
          "player"
        )}.`
      : "Add or import games to unlock the chart detail view.",
    proofCards: [
      {
        label: "Games",
        value: `${args.gamesCount}`,
        helper: pluralize(args.gamesCount, "tracked game"),
        tone: "blue" as const,
      },
      {
        label: "Players",
        value: `${args.playersCount}`,
        helper: pluralize(args.playersCount, "player"),
        tone: "accent" as const,
      },
    ],
  };
}

export function buildChartDetailModel(args: ChartPageModelArgs) {
  if (!args.hasData) {
    return {
      takeaway: "Add or import games to populate this chart view.",
      proofCards: [
        {
          label: "Games",
          value: `${args.gamesCount}`,
          helper: "No tracked games yet",
          tone: "blue" as const,
        },
        {
          label: "Players",
          value: `${args.playersCount}`,
          helper: pluralize(args.playersCount, "available player"),
          tone: "accent" as const,
        },
      ],
      sectionOrder: Array.from(CHART_DETAIL_SECTION_ORDER),
    };
  }

  let model;

  switch (args.chartKey) {
    case "radar":
      model = buildRadarModel(args);
      break;
    case "sparkline":
      model = buildSparklineModel(args);
      break;
    case "relationship_graph":
    case "relationship-graph":
    case "assist_network_overview":
      model = buildRelationshipModel(args);
      break;
    case "head_to_head":
      model = buildHeadToHeadModel(args);
      break;
    case "line_chart":
    case "line":
    case "multi_line_chart":
    case "multi-line-chart":
    case "multi-line":
    case "bar_chart":
    case "bar":
    case "replay_chart":
    case "prestige_over_time":
      model = buildMetricDrivenModel(args);
      break;
    case "stacked_bar_chart":
      model = buildStackedBarModel(args);
      break;
    case "heatmap":
      model = buildHeatmapModel(args);
      break;
    case "efficiency_failure_scatter":
      model = buildEfficiencyFailureScatterModel(args);
      break;
    case "bump_chart":
      model = buildBumpChartDetailModel(args);
      break;
    case "consistency_band":
      model = buildConsistencyBandDetailModel(args);
      break;
    default:
      model = buildFallbackModel(args);
      break;
  }

  return {
    ...model,
    sectionOrder: Array.from(CHART_DETAIL_SECTION_ORDER),
  };
}
