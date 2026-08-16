export type ShareStandingRow = {
  name: string;
  totalPrestige: number;
  contracts?: number;
  assists?: number;
  failures?: number;
};

export type ShareGameResultInput = {
  gameTitle: string;
  playedAt?: string | null;
  groupName?: string | null;
  winnerName?: string | null;
  roundsCount?: number | null;
  /** Preformatted game length, e.g. "1h 12m". Omitted when unmeasurable. */
  durationLabel?: string | null;
  standings: ShareStandingRow[];
};

const MEDALS = ["1.", "2.", "3."];

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rankPrefix(index: number): string {
  return MEDALS[index] ?? `${index + 1}.`;
}

/**
 * Plain-text scoreboard for the OS share sheet. Kept as text rather than an
 * image so it pastes readably into a group chat and stays legible when a
 * messaging app strips formatting.
 */
export function buildGameResultShareText(input: ShareGameResultInput): string {
  const lines: string[] = [];
  const title = String(input.gameTitle ?? "").trim() || "Moonrakers";

  lines.push(`Moonrakers - ${title}`);

  const metaParts: string[] = [];
  if (input.playedAt) metaParts.push(String(input.playedAt).trim());
  if (input.groupName) metaParts.push(String(input.groupName).trim());
  const rounds = toNumber(input.roundsCount);
  if (rounds > 0) metaParts.push(`${rounds} rounds`);
  const duration = String(input.durationLabel ?? "").trim();
  if (duration) metaParts.push(duration);
  if (metaParts.length) lines.push(metaParts.join(" · "));

  const winner = String(input.winnerName ?? "").trim();
  if (winner) {
    lines.push("", `Winner: ${winner}`);
  }

  const standings = Array.isArray(input.standings) ? input.standings : [];
  if (standings.length) {
    lines.push("");
    standings.forEach((row, index) => {
      const name = String(row?.name ?? "").trim() || "Unknown";
      const prestige = toNumber(row?.totalPrestige);
      const detail: string[] = [];

      const contracts = toNumber(row?.contracts);
      const assists = toNumber(row?.assists);
      const failures = toNumber(row?.failures);
      if (contracts > 0) detail.push(`${contracts}c`);
      if (assists > 0) detail.push(`${assists}a`);
      if (failures > 0) detail.push(`${failures}f`);

      const suffix = detail.length ? ` (${detail.join(" ")})` : "";
      lines.push(`${rankPrefix(index)} ${name} - ${prestige} prestige${suffix}`);
    });
  }

  return lines.join("\n");
}
