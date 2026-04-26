type SnapshotEntry = Record<string, number | string | null | undefined>;

export type HeadToHeadPlayer = {
  id: string;
  name?: string | null;
  color?: string | null;
};

export type HeadToHeadSnapshotPoint = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot?: Record<string, SnapshotEntry | undefined>;
};

export type HeadToHeadTimelinePoint = {
  key: string;
  label: string;
  winner: "a" | "b" | "tie";
  winnerName: string | null;
  prestigeMargin: number;
  scoreMargin: number;
  runningPrestigeMargin: number;
  aPrestige: number;
  bPrestige: number;
  aScore: number;
  bScore: number;
};

export type HeadToHeadVisualModel = {
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  playerAColor: string;
  playerBColor: string;
  games: number;
  aWins: number;
  bWins: number;
  ties: number;
  leaderName: string;
  leaderTone: "a" | "b" | "tie";
  swingLeaderName: string | null;
  currentRunWinnerName: string | null;
  currentRunLength: number;
  avgPrestigeMargin: number;
  avgScoreMargin: number;
  maxAbsPrestigeMargin: number;
  recentForm: string[];
  verdict: string;
  timeline: HeadToHeadTimelinePoint[];
  latestResult: HeadToHeadTimelinePoint | null;
};

type BuildHeadToHeadVisualModelArgs = {
  players?: HeadToHeadPlayer[];
  data?: HeadToHeadSnapshotPoint[];
  playerId?: string | null;
  compareId?: string | null;
};

const FALLBACK_COLORS = ["#A855F7", "#3B82F6", "#22C55E", "#F59E0B"];

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getColor(color?: string | null, index = 0) {
  if (typeof color === "string" && color.trim()) return color.trim();
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function playerName(player?: HeadToHeadPlayer | null) {
  return String(player?.name || "Unknown").trim() || "Unknown";
}

function totalPrestige(row?: SnapshotEntry) {
  return (
    n(row?.totalPrestige) ||
    n(row?.prestige) ||
    n(row?.directPrestige) +
      n(row?.assistPrestigeReceived) +
      n(row?.objectivePrestige)
  );
}

function totalScore(row?: SnapshotEntry) {
  return n(row?.score) || totalPrestige(row);
}

function formatSigned(value: number, digits = 1) {
  const fixed = value.toFixed(digits);
  return `${value > 0 ? "+" : ""}${fixed}`;
}

function resolvePlayers(
  players: HeadToHeadPlayer[],
  playerId?: string | null,
  compareId?: string | null
) {
  const playerA =
    players.find((player) => String(player.id) === String(playerId)) ??
    players[0] ??
    null;

  if (!playerA) return { playerA: null, playerB: null };

  const playerB =
    players.find(
      (player) =>
        String(player.id) === String(compareId) &&
        String(player.id) !== String(playerA.id)
    ) ??
    players.find((player) => String(player.id) !== String(playerA.id)) ??
    null;

  return { playerA, playerB };
}

function resolveWinnerTone(prestigeMargin: number) {
  if (prestigeMargin > 0) return "a" as const;
  if (prestigeMargin < 0) return "b" as const;
  return "tie" as const;
}

function buildVerdict(
  leaderName: string,
  leaderTone: "a" | "b" | "tie",
  swingLeaderName: string | null,
  games: number,
  avgPrestigeMargin: number,
  currentRunLength: number
) {
  if (!games) {
    return "No shared games yet.";
  }

  if (leaderTone === "tie") {
    return "This matchup is effectively even across the current sample.";
  }

  if (
    swingLeaderName &&
    swingLeaderName !== leaderName &&
    currentRunLength >= 2
  ) {
    return `${leaderName} owns the larger sample, but ${swingLeaderName} has the recent swing.`;
  }

  return `${leaderName} leads with an average prestige edge of ${formatSigned(
    avgPrestigeMargin,
    1
  )}.`;
}

export function buildHeadToHeadVisualModel({
  players = [],
  data = [],
  playerId = null,
  compareId = null,
}: BuildHeadToHeadVisualModelArgs): HeadToHeadVisualModel | null {
  const { playerA, playerB } = resolvePlayers(players, playerId, compareId);

  if (!playerA || !playerB) return null;

  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let prestigeMarginTotal = 0;
  let scoreMarginTotal = 0;
  let runningPrestigeMargin = 0;

  const timeline: HeadToHeadTimelinePoint[] = [];

  for (let index = 0; index < data.length; index += 1) {
    const point = data[index];
    const aRow = point?.snapshot?.[playerA.id];
    const bRow = point?.snapshot?.[playerB.id];
    if (!aRow || !bRow) continue;

    const aPrestige = totalPrestige(aRow);
    const bPrestige = totalPrestige(bRow);
    const aScore = totalScore(aRow);
    const bScore = totalScore(bRow);
    const prestigeMargin = aPrestige - bPrestige;
    const scoreMargin = aScore - bScore;
    const winner = resolveWinnerTone(prestigeMargin);

    if (winner === "a") aWins += 1;
    else if (winner === "b") bWins += 1;
    else ties += 1;

    prestigeMarginTotal += prestigeMargin;
    scoreMarginTotal += scoreMargin;
    runningPrestigeMargin += prestigeMargin;

    timeline.push({
      key: `${point?.gameIndex ?? point?.round ?? index + 1}-${index}`,
      label:
        point?.label ??
        `Game ${point?.gameIndex ?? point?.round ?? index + 1}`,
      winner,
      winnerName:
        winner === "a"
          ? playerName(playerA)
          : winner === "b"
            ? playerName(playerB)
            : null,
      prestigeMargin,
      scoreMargin,
      runningPrestigeMargin,
      aPrestige,
      bPrestige,
      aScore,
      bScore,
    });
  }

  const games = timeline.length;
  if (!games) return null;

  const avgPrestigeMargin = prestigeMarginTotal / games;
  const avgScoreMargin = scoreMarginTotal / games;
  const leaderTone =
    aWins === bWins
      ? avgPrestigeMargin > 0.5
        ? ("a" as const)
        : avgPrestigeMargin < -0.5
          ? ("b" as const)
          : ("tie" as const)
      : aWins > bWins
        ? ("a" as const)
        : ("b" as const);
  const leaderName =
    leaderTone === "a"
      ? playerName(playerA)
      : leaderTone === "b"
        ? playerName(playerB)
        : `${playerName(playerA)} and ${playerName(playerB)}`;

  const recentSlice = timeline.slice(-3);
  const recentAverage =
    recentSlice.reduce((total, point) => total + point.prestigeMargin, 0) /
    Math.max(1, recentSlice.length);

  const latestResult = timeline[timeline.length - 1] ?? null;
  let currentRunLength = 0;
  let currentRunWinnerName: string | null = null;

  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const point = timeline[index];
    if (point.winner === "tie") {
      if (currentRunLength === 0) continue;
      break;
    }
    if (currentRunWinnerName == null) {
      currentRunWinnerName = point.winnerName;
      currentRunLength = 1;
      continue;
    }
    if (point.winnerName === currentRunWinnerName) {
      currentRunLength += 1;
      continue;
    }
    break;
  }

  const swingLeaderName =
    currentRunWinnerName && currentRunLength >= 2
      ? currentRunWinnerName
      : recentAverage > 0.5
        ? playerName(playerA)
        : recentAverage < -0.5
          ? playerName(playerB)
          : null;

  return {
    playerAId: String(playerA.id),
    playerBId: String(playerB.id),
    playerAName: playerName(playerA),
    playerBName: playerName(playerB),
    playerAColor: getColor(playerA.color, 0),
    playerBColor: getColor(playerB.color, 1),
    games,
    aWins,
    bWins,
    ties,
    leaderName,
    leaderTone,
    swingLeaderName,
    currentRunWinnerName,
    currentRunLength,
    avgPrestigeMargin,
    avgScoreMargin,
    maxAbsPrestigeMargin: Math.max(
      1,
      ...timeline.map((point) => Math.abs(point.prestigeMargin))
    ),
    recentForm: timeline.slice(-5).map((point) => point.winner.toUpperCase()),
    verdict: buildVerdict(
      leaderName,
      leaderTone,
      swingLeaderName,
      games,
      avgPrestigeMargin,
      currentRunLength
    ),
    timeline,
    latestResult,
  };
}
