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

type BuildInsightSummaryStatementsInput = {
  tab: InsightSummaryTab;
  selectedPlayerLabel: string | null;
  metaGames: number;
  personalRows: InsightSummaryRow[];
  pairingRows: InsightSummaryRow[];
  macroRows: InsightSummaryRow[];
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

export function buildInsightSummaryStatements({
  tab,
  selectedPlayerLabel,
  metaGames,
  personalRows,
  pairingRows,
  macroRows,
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
    const strongestRow = findStrongestRow(macroRows);

    return [
      "Reading tablewide win patterns.",
      publishedGamesLabel,
      `${toCountLabel(macroRows.length, "macro factor")} live.`,
      strongestRow
        ? `Top read: ${strongestRow.label || "Macro factor"} at ${formatSigned(toFiniteNumber(strongestRow.value))}.`
        : "No macro correlation signals are published yet.",
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
