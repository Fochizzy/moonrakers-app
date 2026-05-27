export type LeaderboardPlayer = {
  id: string;
  name: string;
  color?: string | null;
};

type LeaderboardSample = {
  playerId?: string | null;
};

type RankPlaystyleLeaderboardArgs = {
  leaderboard: LeaderboardPlayer[];
  authProfileId?: string | null;
  samples: LeaderboardSample[];
};

function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

export function rankPlaystyleLeaderboard({
  leaderboard,
  authProfileId = null,
  samples,
}: RankPlaystyleLeaderboardArgs): LeaderboardPlayer[] {
  const normalizedAuthProfileId = normalizeValue(authProfileId);
  const playCount = new Map<string, number>();
  const originalIndex = new Map<string, number>();

  leaderboard.forEach((player, index) => {
    originalIndex.set(normalizeValue(player.id), index);
  });

  for (const sample of samples) {
    const playerId = normalizeValue(sample?.playerId);
    if (!playerId) {
      continue;
    }

    playCount.set(playerId, (playCount.get(playerId) ?? 0) + 1);
  }

  return [...leaderboard].sort((left, right) => {
    const leftId = normalizeValue(left.id);
    const rightId = normalizeValue(right.id);
    const leftIsSignedIn = Boolean(normalizedAuthProfileId) && leftId === normalizedAuthProfileId;
    const rightIsSignedIn = Boolean(normalizedAuthProfileId) && rightId === normalizedAuthProfileId;

    if (leftIsSignedIn !== rightIsSignedIn) {
      return leftIsSignedIn ? -1 : 1;
    }

    const leftPlayCount = playCount.get(leftId) ?? 0;
    const rightPlayCount = playCount.get(rightId) ?? 0;

    if (leftPlayCount !== rightPlayCount) {
      return rightPlayCount - leftPlayCount;
    }

    const nameCompare = left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return (originalIndex.get(leftId) ?? 0) - (originalIndex.get(rightId) ?? 0);
  });
}
