import {
  buildInsightSummaryStatements,
} from "../../../../../utils/insightSummaries";
import {
  DEFINITION_GROUPS,
  type DefinitionItem,
} from "../../../../../utils/definitionCatalog";

import { PREVIEW_LEAGUE_ROWS } from "./previewData";
import {
  PREVIEW_ASSIST_EDGES,
  PREVIEW_GAMES,
  PREVIEW_PLAYERS,
  type PreviewPlayerId,
  type PreviewResult,
} from "./previewSnapshot";

/**
 * Naming a metric proves nothing — a reader has no idea whether "Assist Share"
 * is a number, a label, or a chart until they see one. Everything here is the
 * catalog's own title and wording, filled in with values summed straight from
 * the snapshot rows, so the preview shows the shape of a real answer without
 * inventing either the metric or the number.
 */

type Format = "count" | "decimal" | "percent" | "text";

export type PreviewMetricRow = {
  /** The definition the signed-in Definitions page prints, verbatim. */
  body: string;
  family: string;
  format: Format;
  key: string;
  /** Which end of the row is the good end, or null when neither is. */
  leader: "high" | "low" | null;
  title: string;
  values: Record<PreviewPlayerId, number>;
};

export type PreviewIntelRead = {
  playerId: PreviewPlayerId;
  playerName: string;
  reads: Array<{ body: string; title: string; value: string }>;
};

const RESULTS = PREVIEW_GAMES.flat();

function resultsFor(playerId: PreviewPlayerId) {
  return RESULTS.filter((result) => result.playerId === playerId);
}

function sumFor(playerId: PreviewPlayerId, read: (row: PreviewResult) => number) {
  return resultsFor(playerId).reduce((total, row) => total + read(row), 0);
}

function assistsSent(playerId: PreviewPlayerId) {
  return PREVIEW_ASSIST_EDGES.filter((edge) => edge.from === playerId);
}

function assistsReceived(playerId: PreviewPlayerId) {
  return PREVIEW_ASSIST_EDGES.filter((edge) => edge.to === playerId);
}

/** Runs the derivation for every player so a row is filled in one place. */
function byPlayer(read: (playerId: PreviewPlayerId) => number) {
  return PREVIEW_PLAYERS.reduce(
    (values, member) => {
      values[member.id] = read(member.id);
      return values;
    },
    {} as Record<PreviewPlayerId, number>,
  );
}

function definition(groupKey: string, itemKey: string): DefinitionItem {
  const group = DEFINITION_GROUPS.find((entry) => entry.key === groupKey);
  const item = group?.items.find((entry) => entry.key === itemKey);

  if (!group || !item) {
    throw new Error(`Preview references a metric the catalog no longer publishes: ${groupKey}.${itemKey}`);
  }

  return item;
}

function row(
  groupKey: string,
  itemKey: string,
  format: Format,
  leader: PreviewMetricRow["leader"],
  read: (playerId: PreviewPlayerId) => number,
): PreviewMetricRow {
  const group = DEFINITION_GROUPS.find((entry) => entry.key === groupKey);
  const item = definition(groupKey, itemKey);

  return {
    body: item.body,
    family: group?.title ?? groupKey,
    format,
    key: `${groupKey}.${itemKey}`,
    leader,
    title: item.title,
    values: byPlayer(read),
  };
}

function ratioPercent(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

/**
 * One row per family that the snapshot can answer exactly. Families whose
 * metrics are modelled rather than counted — Projection, Correlations — are
 * left to the catalog below; guessing at them here would be inventing output.
 */
export const PREVIEW_METRIC_ROWS: PreviewMetricRow[] = [
  row("scoring", "totalPrestige", "count", "high", (id) =>
    sumFor(id, (result) => result.totalPrestige),
  ),
  row("scoring", "avgPrestigePerGame", "decimal", "high", (id) => {
    const results = resultsFor(id);
    return results.length > 0
      ? sumFor(id, (result) => result.totalPrestige) / results.length
      : 0;
  }),
  row("scoring", "objectiveShareOfPrestige", "percent", null, (id) =>
    ratioPercent(
      sumFor(id, (result) => result.objectivePrestige),
      sumFor(id, (result) => result.totalPrestige),
    ),
  ),
  row("efficiency", "directEfficiency", "decimal", "high", (id) => {
    const contracts = sumFor(id, (result) => result.contracts);
    return contracts > 0
      ? sumFor(id, (result) => result.directPrestige) / contracts
      : 0;
  }),
  row("efficiency", "assistShare", "percent", null, (id) =>
    ratioPercent(
      sumFor(id, (result) => result.assistPrestigeReceived),
      sumFor(id, (result) => result.totalPrestige),
    ),
  ),
  row("support", "assistPrestigeGained", "count", "high", (id) =>
    assistsSent(id).reduce((total, edge) => total + edge.assistPrestige, 0),
  ),
  row("pressure", "failureRate", "percent", "low", (id) => {
    const contracts = sumFor(id, (result) => result.contracts);
    const failures = sumFor(id, (result) => result.failures);
    return ratioPercent(failures, contracts + failures);
  }),
  row("turnOrder", "avgStartSeat", "decimal", null, (id) => {
    const results = resultsFor(id);
    return results.length > 0
      ? results.reduce((total, result) => total + result.seat + 1, 0) /
          results.length
      : 0;
  }),
];

/** Says, in one line, that nothing in the table above is modelled. */
export const PREVIEW_METRIC_METHOD =
  "Every cell is summed or averaged straight from the snapshot rows: prestige by source, contracts, failures, assists and seat. Nothing here is estimated.";

/**
 * The Moonrakers Intel reads whose catalog entry states the rule precisely
 * enough to apply it — a label the app derives, derived the same way here.
 */
function styleRead(playerId: PreviewPlayerId) {
  const parts = [
    { label: "Direct", value: sumFor(playerId, (r) => r.directPrestige) },
    {
      label: "Support",
      value: sumFor(playerId, (r) => r.assistPrestigeReceived),
    },
    { label: "Objective", value: sumFor(playerId, (r) => r.objectivePrestige) },
  ].sort((left, right) => right.value - left.value);

  const [top, second] = parts;
  if (!top || !second || top.value === 0) {
    return "Balanced";
  }

  // "Stands furthest ahead": a lead inside a tenth of the runner-up is not one.
  return top.value >= second.value * 1.1 ? top.label : "Balanced";
}

function supportStyle(playerId: PreviewPlayerId) {
  const given = assistsSent(playerId).reduce(
    (total, edge) => total + edge.assists,
    0,
  );
  const received = assistsReceived(playerId).reduce(
    (total, edge) => total + edge.assists,
    0,
  );

  if (given === 0 && received === 0) {
    return "Balanced";
  }
  if (given >= received * 1.25) {
    return "Giver";
  }
  if (received >= given * 1.25) {
    return "Receiver";
  }
  return "Balanced";
}

function mostCommonAssistTarget(playerId: PreviewPlayerId) {
  const top = [...assistsSent(playerId)].sort(
    (left, right) => right.assists - left.assists,
  )[0];

  if (!top || top.assists === 0) {
    return "No assists recorded";
  }

  const name =
    PREVIEW_PLAYERS.find((member) => member.id === top.to)?.name ?? top.to;

  return `${name} · ${top.assists} assists`;
}

export const PREVIEW_INTEL_READS: PreviewIntelRead[] = PREVIEW_LEAGUE_ROWS.map(
  (leagueRow) => ({
    playerId: leagueRow.id,
    playerName: leagueRow.name,
    reads: [
      {
        title: definition("intel", "styleRead").title,
        body: definition("intel", "styleRead").body,
        value: styleRead(leagueRow.id),
      },
      {
        title: definition("intel", "supportStyle").title,
        body: definition("intel", "supportStyle").body,
        value: supportStyle(leagueRow.id),
      },
      {
        title: definition("intel", "mostCommonAssistTarget").title,
        body: definition("intel", "mostCommonAssistTarget").body,
        value: mostCommonAssistTarget(leagueRow.id),
      },
    ],
  }),
);

/** Pearson correlation, which for a 0/1 outcome is the point-biserial. */
function correlationWithWinning(read: (result: PreviewResult) => number) {
  const xs = RESULTS.map(read);
  const ys: number[] = RESULTS.map((result) => (result.won ? 1 : 0));
  const n = xs.length;

  if (n === 0) {
    return 0;
  }

  const meanX = xs.reduce((total, value) => total + value, 0) / n;
  const meanY = ys.reduce((total, value) => total + value, 0) / n;

  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let index = 0; index < n; index += 1) {
    const dx = (xs[index] ?? 0) - meanX;
    const dy = (ys[index] ?? 0) - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }

  const denominator = Math.sqrt(varianceX * varianceY);
  return denominator > 0 ? covariance / denominator : 0;
}

const MACRO_ROWS = [
  { label: "Direct prestige", value: correlationWithWinning((r) => r.directPrestige) },
  {
    label: "Assist prestige received",
    value: correlationWithWinning((r) => r.assistPrestigeReceived),
  },
  {
    label: "Objective prestige",
    value: correlationWithWinning((r) => r.objectivePrestige),
  },
  { label: "Contracts", value: correlationWithWinning((r) => r.contracts) },
  { label: "Failures", value: correlationWithWinning((r) => r.failures) },
];

function buildTurnOrderSummary() {
  const seats = [0, 1, 2, 3].map((seat) => {
    const rows = RESULTS.filter((result) => result.seat === seat);
    const wins = rows.filter((result) => result.won).length;

    return {
      seat: seat + 1,
      label: `Seat ${seat + 1}`,
      appearances: rows.length,
      wins,
      // The engine formats this as a percentage, so it wants a fraction.
      winRate: rows.length > 0 ? wins / rows.length : 0,
    };
  }).filter((entry) => entry.appearances > 0);

  const ranked = [...seats].sort((left, right) => right.winRate - left.winRate);
  const bestSeat = ranked[0] ?? null;
  const worstSeat = ranked[ranked.length - 1] ?? null;

  return {
    totalGames: PREVIEW_GAMES.length,
    turnOrderWinCorrelation:
      (bestSeat?.winRate ?? 0) - (worstSeat?.winRate ?? 0),
    bestSeat,
    worstSeat,
    summary: null,
  };
}

/**
 * Rendered by the app's own statement builder rather than by sentences written
 * for the preview, so what a visitor reads here is the wording they get once
 * they sign in.
 */
export const PREVIEW_TABLE_SIGNALS = buildInsightSummaryStatements({
  tab: "macroCorrelations",
  selectedPlayerLabel: null,
  metaGames: PREVIEW_GAMES.length,
  personalRows: [],
  pairingRows: [],
  macroRows: MACRO_ROWS,
  turnOrderSummary: buildTurnOrderSummary(),
  synergyPairs: [],
  players: PREVIEW_PLAYERS.map((member) => ({
    id: member.id,
    name: member.name,
  })),
});

export const PREVIEW_MACRO_ROWS = MACRO_ROWS;
