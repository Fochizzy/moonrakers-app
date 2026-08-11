export type InsightSummaryTab =
  | "pairingCorrelations"
  | "macroCorrelations"
  | "topSynergyPairs";

type InsightSummaryRow = {
  label?: string | null;
  value?: number | null;
};

type InsightSummaryPair = {
  a?: string | null;
  b?: string | null;
  score?: number | null;
};

type InsightSummaryPlayer = {
  id?: string | null;
  name?: string | null;
};

type InsightSummaryTurnOrderRow = {
  seat?: number | null;
  label?: string | null;
  appearances?: number | null;
  wins?: number | null;
  winRate?: number | null;
};

type InsightSummaryTurnOrderSummary = {
  totalGames?: number | null;
  turnOrderWinCorrelation?: number | null;
  bestSeat?: InsightSummaryTurnOrderRow | null;
  worstSeat?: InsightSummaryTurnOrderRow | null;
  summary?: string | null;
};

type BuildInsightSummaryStatementsInput = {
  tab: InsightSummaryTab;
  selectedPlayerLabel: string | null;
  metaGames: number;
  personalRows: InsightSummaryRow[];
  pairingRows: InsightSummaryRow[];
  macroRows: InsightSummaryRow[];
  turnOrderSummary: InsightSummaryTurnOrderSummary | null;
  synergyPairs: InsightSummaryPair[];
  players: InsightSummaryPlayer[];
};

function toCountLabel(
  value: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatSigned(value: number) {
  const normalized = toFiniteNumber(value);
  const sign = normalized > 0 ? "+" : "";
  return `${sign}${normalized.toFixed(2)}`;
}

function formatPercent(value: number) {
  return `${Math.round(toFiniteNumber(value) * 100)}%`;
}

function normalizeStatementLabel(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function buildPlayerNameMap(players: InsightSummaryPlayer[]) {
  return new Map(
    players
      .map((player) => {
        const id = String(player?.id ?? "").trim();
        const name = String(player?.name ?? "").trim();
        return id && name ? [id, name] : null;
      })
      .filter((entry): entry is [string, string] => Array.isArray(entry)),
  );
}

function findStrongestRow(rows: InsightSummaryRow[]) {
  return [...rows].sort(
    (left, right) =>
      Math.abs(toFiniteNumber(right?.value)) - Math.abs(toFiniteNumber(left?.value)),
  )[0] ?? null;
}

function resolveSynergyLabel(
  pair: InsightSummaryPair | null,
  playerNameMap: Map<string, string>,
) {
  if (!pair) {
    return null;
  }

  const leftId = String(pair.a ?? "").trim();
  const rightId = String(pair.b ?? "").trim();
  const leftName = playerNameMap.get(leftId) ?? (leftId || "Player A");
  const rightName = playerNameMap.get(rightId) ?? (rightId || "Player B");

  return `${leftName} + ${rightName}`;
}

function resolveTurnOrderSeatLabel(row: InsightSummaryTurnOrderRow | null | undefined) {
  const explicitLabel = String(row?.label ?? "").trim();
  if (explicitLabel) {
    return explicitLabel;
  }

  const seat = Math.round(toFiniteNumber(row?.seat));
  return seat > 0 ? `Seat ${seat}` : "Seat";
}

function buildMacroFactorStatement(macroRows: InsightSummaryRow[]) {
  const strongestRow = findStrongestRow(macroRows);
  if (!strongestRow) {
    return "No macro correlation signals are published yet.";
  }

  return `${toCountLabel(macroRows.length, "macro factor")} live; top read: ${
    strongestRow.label || "Macro factor"
  } at ${formatSigned(toFiniteNumber(strongestRow.value))}.`;
}

function buildTurnOrderContextStatement(
  turnOrderSummary: InsightSummaryTurnOrderSummary | null,
  fallbackGamesLabel: string,
) {
  if (!turnOrderSummary) {
    return fallbackGamesLabel;
  }

  const totalGames = Math.max(0, Math.round(toFiniteNumber(turnOrderSummary.totalGames)));
  const publishedSummary = String(turnOrderSummary.summary ?? "").trim();
  const baseStatement =
    publishedSummary ||
    (totalGames > 0
      ? `Turn-order sample: ${toCountLabel(totalGames, "finished game")}.`
      : fallbackGamesLabel);

  if (totalGames <= 0 && !publishedSummary) {
    return fallbackGamesLabel;
  }

  if (totalGames <= 0) {
    return baseStatement;
  }

  return `${baseStatement} Influence: ${formatSigned(
    toFiniteNumber(turnOrderSummary.turnOrderWinCorrelation),
  )}.`;
}

function buildTurnOrderSeatStatement(
  turnOrderSummary: InsightSummaryTurnOrderSummary | null,
) {
  if (!turnOrderSummary) {
    return "No published turn-order interpretation yet.";
  }

  const bestSeat = turnOrderSummary.bestSeat ?? null;
  const worstSeat = turnOrderSummary.worstSeat ?? null;

  if (!bestSeat && !worstSeat) {
    return "No seat-level turn-order split is published yet.";
  }

  const sameSeatRow =
    bestSeat &&
    worstSeat &&
    Math.round(toFiniteNumber(bestSeat.seat)) ===
      Math.round(toFiniteNumber(worstSeat.seat)) &&
    Math.round(toFiniteNumber(bestSeat.appearances)) ===
      Math.round(toFiniteNumber(worstSeat.appearances)) &&
    Math.round(toFiniteNumber(bestSeat.wins)) ===
      Math.round(toFiniteNumber(worstSeat.wins)) &&
    toFiniteNumber(bestSeat.winRate) === toFiniteNumber(worstSeat.winRate) &&
    normalizeStatementLabel(bestSeat.label) === normalizeStatementLabel(worstSeat.label);

  if (sameSeatRow && bestSeat) {
    return `Turn-order split is flat so far: ${resolveTurnOrderSeatLabel(
      bestSeat,
    )} at ${formatPercent(toFiniteNumber(bestSeat.winRate))} in ${toCountLabel(
      Math.max(0, Math.round(toFiniteNumber(bestSeat.appearances))),
      "start",
    )}.`;
  }

  const segments: string[] = [];

  if (bestSeat) {
    segments.push(
      `Best seat: ${resolveTurnOrderSeatLabel(bestSeat)} at ${formatPercent(
        toFiniteNumber(bestSeat.winRate),
      )} in ${toCountLabel(
        Math.max(0, Math.round(toFiniteNumber(bestSeat.appearances))),
        "start",
      )}`,
    );
  }

  if (worstSeat) {
    segments.push(
      `${bestSeat ? "lowest" : "Worst seat"}: ${resolveTurnOrderSeatLabel(
        worstSeat,
      )} at ${formatPercent(toFiniteNumber(worstSeat.winRate))} in ${toCountLabel(
        Math.max(0, Math.round(toFiniteNumber(worstSeat.appearances))),
        "start",
      )}`,
    );
  }

  return `${segments.join("; ")}.`;
}

export function buildInsightSummaryStatements({
  tab,
  selectedPlayerLabel,
  metaGames,
  personalRows,
  pairingRows,
  macroRows,
  turnOrderSummary,
  synergyPairs,
  players,
}: BuildInsightSummaryStatementsInput) {
  const playerNameMap = buildPlayerNameMap(players);
  const normalizedGames = Math.max(0, metaGames);
  const publishedGamesLabel = `${toCountLabel(
    normalizedGames,
    "finished game",
  )} ${normalizedGames === 1 ? "is" : "are"} in sample.`;

  if (tab === "pairingCorrelations") {
    const focusLabel = selectedPlayerLabel?.trim() || "This player";
    const strongestRow = findStrongestRow([...pairingRows, ...personalRows]);

    return [
      `Personal focus: ${focusLabel}.`,
      publishedGamesLabel,
      `${toCountLabel(personalRows.length, "personal signal")}, ${toCountLabel(
        pairingRows.length,
        "partner trend",
      )}.`,
      strongestRow
        ? `Top read: ${strongestRow.label || "Personal signal"} at ${formatSigned(toFiniteNumber(strongestRow.value))}.`
        : "No personal correlation signals are published yet.",
    ];
  }

  if (tab === "macroCorrelations") {
    return [
      "Reading tablewide win patterns.",
      buildMacroFactorStatement(macroRows),
      buildTurnOrderContextStatement(turnOrderSummary, publishedGamesLabel),
      buildTurnOrderSeatStatement(turnOrderSummary),
    ];
  }

  const strongestPair =
    [...synergyPairs].sort(
      (left, right) => toFiniteNumber(right?.score) - toFiniteNumber(left?.score),
    )[0] ?? null;
  const strongestPairLabel = resolveSynergyLabel(strongestPair, playerNameMap);

  return [
    "Ranking repeat pair chemistry.",
    publishedGamesLabel,
    `${toCountLabel(synergyPairs.length, "alliance pair")} live.`,
    strongestPair && strongestPairLabel
      ? `Top live pair: ${strongestPairLabel} at ${Math.round(toFiniteNumber(strongestPair.score))}.`
      : "No synergy pairs are published yet.",
  ];
}
