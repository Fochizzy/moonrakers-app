export type AssistNetworkInterpretationInput = {
  playerCount: number;
  linkCount: number;
  sampleGameCount: number;
  exactScopeApplied: boolean;
  hubName: string;
  hubValue?: number | null;
  netGiverName: string;
  netGiverValue?: number | null;
  netReceiverName: string;
  netReceiverValue?: number | null;
  topLinkLabel: string;
  topLinkValue: string;
};

function safeCount(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function safeOneDecimal(value: number | null | undefined, fallback = 0) {
  const resolved = typeof value === "number" ? value : Number(value);
  const safeValue = Number.isFinite(resolved) ? resolved : fallback;
  return safeValue.toFixed(1);
}

function formatSigned(value: number | null | undefined, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : fallback;
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(1)}`;
}

function safeLabel(value: string | null | undefined, fallback: string) {
  const resolved = String(value ?? "").trim();
  return resolved.length > 0 ? resolved : fallback;
}

export function buildAssistNetworkInterpretation(
  input: AssistNetworkInterpretationInput
) {
  const playerCount = safeCount(input.playerCount);
  const linkCount = safeCount(input.linkCount);
  const sampleGameCount = safeCount(input.sampleGameCount);
  const scopeLabel = input.exactScopeApplied
    ? "exact-match games"
    : "filtered games";
  const hubName = safeLabel(input.hubName, "This table");
  const netGiverName = safeLabel(input.netGiverName, "No single player");
  const netReceiverName = safeLabel(input.netReceiverName, "No single player");
  const topLinkLabel = safeLabel(input.topLinkLabel, "No visible lane");
  const topLinkValue = safeLabel(input.topLinkValue, "0.0/game");

  return [
    `This view maps ${playerCount} players and ${linkCount} directed links across ${sampleGameCount} ${scopeLabel}, so denser clusters point to the most active assist traffic in the table.`,
    `${hubName} is the current hub at ${safeOneDecimal(input.hubValue)} total involvement, which means more of the table's assist flow runs through them than anyone else.`,
    `${netGiverName} is the biggest net giver at ${formatSigned(input.netGiverValue)}, so they send more support outward than they take back in this sample.`,
    `${netReceiverName} is the biggest net receiver at ${formatSigned(input.netReceiverValue)}, which signals that more value is flowing toward them from teammates overall.`,
    `The strongest visible lane is ${topLinkLabel} at ${topLinkValue}, and the edge labels are per-game rates, so recurring habits matter more here than one-off totals.`,
  ];
}
