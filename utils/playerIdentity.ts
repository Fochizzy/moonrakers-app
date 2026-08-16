export type PlayerIdentityInput = {
  id?: string | number;
  name?: string;
  displayName?: string;
  title?: string;
  subtitle?: string;
  color?: string;
  wins?: number;
  gamesPlayed?: number;
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assists?: number;
  contractsSucceeded?: number;
  contractsFailed?: number;
  objectivesCompleted?: number;
  score?: number;
};

export type IdentityAxisKey =
  | "pressure"
  | "conversion"
  | "support"
  | "efficiency"
  | "resilience"
  | "winning";

export type IdentityAxis = {
  key: IdentityAxisKey;
  label: string;
  adjective: string;
  description: string;
  gameplayMeaning: string;
  value: number;
};

export type PlayerIdentity = {
  displayName: string;
  subtitle: string;
  archetype: string;
  summaryText: string;
  axes: IdentityAxis[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function getInitials(name?: string) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "MR";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function adjectiveFor(value: number) {
  if (value >= 85) return "Elite";
  if (value >= 70) return "Strong";
  if (value >= 55) return "Reliable";
  if (value >= 40) return "Balanced";
  if (value >= 25) return "Developing";
  return "Emerging";
}

function buildAxis(
  key: IdentityAxisKey,
  label: string,
  value: number,
  description: string,
  gameplayMeaning: string
): IdentityAxis {
  return {
    key,
    label,
    adjective: adjectiveFor(value),
    description,
    gameplayMeaning,
    value: clamp(value),
  };
}

function buildSubtitle(input: PlayerIdentityInput, displayName: string) {
  if (String(input.subtitle ?? "").trim()) {
    return String(input.subtitle).trim();
  }

  const title = String(input.title ?? "").trim();
  if (title) {
    return `${title} · Callsign ${getInitials(displayName)}`;
  }

  return `Callsign ${getInitials(displayName)}`;
}

function buildArchetype(topAxis: IdentityAxis) {
  switch (topAxis.key) {
    case "pressure":
      return "Tempo Captain";
    case "conversion":
      return "Closer";
    case "support":
      return "Wing Commander";
    case "efficiency":
      return "Systems Pilot";
    case "resilience":
      return "Stabilizer";
    case "winning":
      return "Finisher";
    default:
      return "Balanced Operator";
  }
}

export function buildPlayerIdentity(input: PlayerIdentityInput): PlayerIdentity {
  const displayName =
    String(input.displayName ?? "").trim() ||
    String(input.name ?? "").trim() ||
    "Unknown Player";

  const gamesPlayed = Math.max(0, toNumber(input.gamesPlayed));
  const wins = Math.max(0, toNumber(input.wins));
  const totalPrestige = Math.max(
    0,
    toNumber(input.totalPrestige ?? input.prestige)
  );
  const directPrestige = Math.max(0, toNumber(input.directPrestige));
  const assistPrestigeReceived = Math.max(0, toNumber(input.assistPrestigeReceived));
  const assists = Math.max(0, toNumber(input.assists));
  const contractsSucceeded = Math.max(0, toNumber(input.contractsSucceeded));
  const contractsFailed = Math.max(0, toNumber(input.contractsFailed));
  const objectivesCompleted = Math.max(0, toNumber(input.objectivesCompleted));
  const totalContracts = contractsSucceeded + contractsFailed;
  const safeGames = Math.max(1, gamesPlayed);
  const safeContracts = Math.max(1, totalContracts);
  const winRate = gamesPlayed > 0 ? wins / safeGames : 0;
  const successRate = totalContracts > 0 ? contractsSucceeded / safeContracts : 0;
  const failureRate = totalContracts > 0 ? contractsFailed / safeContracts : 0;
  const prestigePerGame = totalPrestige / safeGames;
  const directPerGame = directPrestige / safeGames;
  const supportPerGame = assistPrestigeReceived / safeGames;
  const assistsPerGame = assists / safeGames;
  const objectivePerGame = objectivesCompleted / safeGames;
  const actionsPerGame = (contractsSucceeded + assists + objectivesCompleted) / safeGames;

  const pressure = clamp(directPerGame * 2.2 + objectivePerGame * 9 + successRate * 20);
  const conversion = clamp(winRate * 55 + successRate * 35 + objectivePerGame * 5);
  const support = clamp(supportPerGame * 4.5 + assistsPerGame * 12 + winRate * 15);
  const efficiency = clamp(prestigePerGame * 2.1 + (actionsPerGame > 0 ? (prestigePerGame / actionsPerGame) * 28 : 0));
  const resilience = clamp((1 - failureRate) * 55 + Math.min(gamesPlayed, 12) * 3 + winRate * 18);
  const winning = clamp(winRate * 65 + Math.min(wins, 10) * 3 + prestigePerGame * 1.1);

  const axes: IdentityAxis[] = [
    buildAxis(
      "pressure",
      "Pressure",
      pressure,
      "How strongly this player creates forward momentum through direct prestige and objective pressure.",
      "Higher pressure players tend to set the pace early and force the table to react to them."
    ),
    buildAxis(
      "conversion",
      "Conversion",
      conversion,
      "How consistently good positions turn into completed contracts, secure leads, and real wins.",
      "Higher conversion suggests this player closes the loop instead of leaving value on the table."
    ),
    buildAxis(
      "support",
      "Support",
      support,
      "How often this player gains or creates value through assists and cooperative table play.",
      "Higher support indicates someone who benefits from and contributes to shared-value lines."
    ),
    buildAxis(
      "efficiency",
      "Efficiency",
      efficiency,
      "How much prestige this player tends to produce per game and per meaningful action.",
      "Higher efficiency points to clean value generation with less wasted motion."
    ),
    buildAxis(
      "resilience",
      "Resilience",
      resilience,
      "How well this player avoids collapses, absorbs failed turns, and keeps an even floor.",
      "Higher resilience players usually stay live deeper into the game and recover better from misses."
    ),
    buildAxis(
      "winning",
      "Winning",
      winning,
      "A blended signal of actual wins, rate-based success, and repeated finishing strength.",
      "Higher winning scores show someone whose whole profile is translating into top-end results."
    ),
  ];

  const sorted = [...axes].sort((a, b) => b.value - a.value);
  const topAxis = sorted[0]!;
  const secondaryAxis = sorted[1]!;
  const lowAxis = [...axes].sort((a, b) => a.value - b.value)[0]!;
  const archetype = buildArchetype(topAxis);
  const subtitle = buildSubtitle(input, displayName);
  const summaryText = `${displayName} reads as a ${archetype.toLowerCase()} with strongest signals in ${topAxis.label.toLowerCase()} and ${secondaryAxis.label.toLowerCase()}. The clearest next growth area is ${lowAxis.label.toLowerCase()}, which is the lightest part of the current profile.`;

  return {
    displayName,
    subtitle,
    archetype,
    summaryText,
    axes,
  };
}
