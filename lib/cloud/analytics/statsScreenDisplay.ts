type PayloadRecord = Record<string, unknown>;

export type StatsDisplayRow = {
  key: string;
  label: string;
  value: string;
  detail?: string;
};

type PlayerCountSplitRow = {
  playerCount: number;
  games: number;
  wins: number;
  avgPrestige: number | null;
  avgAssists: number | null;
  avgFailures: number | null;
};

type PlayerCountBucket = {
  key: "two-player" | "three-plus";
  label: "2-player" | "3+ players";
  games: number;
  wins: number;
  avgPrestige: number | null;
  avgAssists: number | null;
  avgFailures: number | null;
};

function toArray(value: unknown): PayloadRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is PayloadRecord => Boolean(entry) && typeof entry === "object")
    : [];
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function formatSignedNumber(value: number): string {
  const normalized = formatNumber(Math.abs(value));
  return value > 0 ? `+${normalized}` : value < 0 ? `-${normalized}` : normalized;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function joinParts(parts: Array<string | null | undefined>): string | undefined {
  const compact = parts.filter((part): part is string => Boolean(part && part.trim()));
  return compact.length > 0 ? compact.join(" | ") : undefined;
}

function buildPlayerCountBuckets(value: unknown): PlayerCountBucket[] {
  const buckets = new Map<
    PlayerCountBucket["key"],
    {
      key: PlayerCountBucket["key"];
      label: PlayerCountBucket["label"];
      games: number;
      wins: number;
      prestigeTotal: number;
      assistTotal: number;
      failureTotal: number;
      prestigeWeight: number;
      assistWeight: number;
      failureWeight: number;
    }
  >();

  for (const entry of toArray(value)) {
    const splitEntry = entry as Partial<PlayerCountSplitRow>;
    const playerCount = toNumberValue(splitEntry.playerCount);
    const games = toNumberValue(splitEntry.games);
    const wins = toNumberValue(splitEntry.wins);
    const avgPrestige = toNumberValue(splitEntry.avgPrestige);
    const avgAssists = toNumberValue(splitEntry.avgAssists);
    const avgFailures = toNumberValue(splitEntry.avgFailures);

    if (
      playerCount === null ||
      games === null ||
      wins === null ||
      games <= 0 ||
      !Number.isInteger(playerCount) ||
      (playerCount !== 2 && playerCount < 3)
    ) {
      continue;
    }

    const key: PlayerCountBucket["key"] = playerCount === 2 ? "two-player" : "three-plus";
    const label: PlayerCountBucket["label"] = playerCount === 2 ? "2-player" : "3+ players";
    const bucket =
      buckets.get(key) ??
      {
        key,
        label,
        games: 0,
        wins: 0,
        prestigeTotal: 0,
        assistTotal: 0,
        failureTotal: 0,
        prestigeWeight: 0,
        assistWeight: 0,
        failureWeight: 0,
      };

    bucket.games += games;
    bucket.wins += wins;

    if (avgPrestige !== null) {
      bucket.prestigeTotal += avgPrestige * games;
      bucket.prestigeWeight += games;
    }

    if (avgAssists !== null) {
      bucket.assistTotal += avgAssists * games;
      bucket.assistWeight += games;
    }

    if (avgFailures !== null) {
      bucket.failureTotal += avgFailures * games;
      bucket.failureWeight += games;
    }

    buckets.set(key, bucket);
  }

  return ["two-player", "three-plus"]
    .map((key) => buckets.get(key as PlayerCountBucket["key"]))
    .filter(
      (
        bucket,
      ): bucket is {
        key: PlayerCountBucket["key"];
        label: PlayerCountBucket["label"];
        games: number;
        wins: number;
        prestigeTotal: number;
        assistTotal: number;
        failureTotal: number;
        prestigeWeight: number;
        assistWeight: number;
        failureWeight: number;
      } => Boolean(bucket && bucket.games > 0),
    )
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      games: bucket.games,
      wins: bucket.wins,
      avgPrestige: bucket.prestigeWeight > 0 ? bucket.prestigeTotal / bucket.prestigeWeight : null,
      avgAssists: bucket.assistWeight > 0 ? bucket.assistTotal / bucket.assistWeight : null,
      avgFailures: bucket.failureWeight > 0 ? bucket.failureTotal / bucket.failureWeight : null,
    }));
}

export function normalizeStatsCorrelationRows(value: unknown): StatsDisplayRow[] {
  return toArray(value).map((entry, index) => {
    const key =
      toStringValue(entry.key) ||
      toStringValue(entry.id) ||
      `correlation-${index + 1}`;
    const label =
      toStringValue(entry.label) ||
      toStringValue(entry.title) ||
      `Correlation ${index + 1}`;
    const explicitValue = toNumberValue(entry.value);
    const whenWin = toNumberValue(entry.whenWin);
    const whenLose = toNumberValue(entry.whenLose);
    const delta = toNumberValue(entry.delta);
    const description = toStringValue(entry.description);
    const strength = toStringValue(entry.strength);

    let displayValue = "-";
    if (explicitValue !== null) {
      displayValue = formatNumber(explicitValue);
    } else if (whenWin !== null || whenLose !== null) {
      const winLabel = whenWin !== null ? formatNumber(whenWin) : "-";
      const loseLabel = whenLose !== null ? formatNumber(whenLose) : "-";
      displayValue = `Win ${winLabel} | Loss ${loseLabel}`;
    } else if (delta !== null) {
      displayValue = `Delta ${formatSignedNumber(delta)}`;
    }

    const detail = joinParts([
      delta !== null && (whenWin !== null || whenLose !== null)
        ? `Delta ${formatSignedNumber(delta)}`
        : null,
      description || null,
      !description && strength ? `${strength} correlation` : null,
    ]);

    return {
      key,
      label,
      value: displayValue,
      ...(detail ? { detail } : {}),
    };
  });
}

export function normalizeStatsGameRows(value: unknown): StatsDisplayRow[] {
  return toArray(value).map((entry, index) => {
    const key =
      toStringValue(entry.gameId) ||
      toStringValue(entry.id) ||
      toStringValue(entry.key) ||
      `game-${index + 1}`;
    const label =
      toStringValue(entry.label) ||
      toStringValue(entry.title) ||
      toStringValue(entry.groupName) ||
      `Game ${index + 1}`;
    const isWinner = entry.isWinner === true;
    const prestige = toNumberValue(entry.prestige);
    const playerCount = toNumberValue(entry.playerCount);
    const winnerName = toStringValue(entry.winnerName);
    const prestigeSpread = toNumberValue(entry.prestigeSpread);
    const contracts = toNumberValue(entry.contracts);
    const assists = toNumberValue(entry.assists);
    const failures = toNumberValue(entry.failures);

    const value = joinParts([
      isWinner ? "Win" : "Loss",
      prestige !== null ? `${formatNumber(prestige)} prestige` : null,
      playerCount !== null ? `${formatNumber(playerCount)}p` : null,
    ]) ?? "Tracked game";

    const detail = joinParts([
      !isWinner && winnerName ? `Winner ${winnerName}` : null,
      prestigeSpread !== null ? `Spread ${formatNumber(prestigeSpread)}` : null,
      contracts !== null
        ? `${formatNumber(contracts)} ${pluralize(contracts, "contract")}`
        : null,
      assists !== null
        ? `${formatNumber(assists)} ${pluralize(assists, "assist")}`
        : null,
      failures !== null
        ? `${formatNumber(failures)} ${pluralize(failures, "failure", "failures")}`
        : null,
    ]);

    return {
      key,
      label,
      value,
      ...(detail ? { detail } : {}),
    };
  });
}

export function normalizeStatsPlayerCountOverviewRows(value: unknown): StatsDisplayRow[] {
  return buildPlayerCountBuckets(value).map((bucket) => ({
    key: `${bucket.key}-overview`,
    label: bucket.label,
    value: `${Math.round((bucket.wins / bucket.games) * 100)}% win rate`,
    detail: joinParts([
      `${bucket.games} ${pluralize(bucket.games, "game")} tracked`,
      `${bucket.wins} ${pluralize(bucket.wins, "win")}`,
      bucket.avgPrestige !== null ? `${formatNumber(bucket.avgPrestige)} avg prestige` : null,
    ]),
  }));
}

export function normalizeStatsPlayerCountSummaryRows(value: unknown): StatsDisplayRow[] {
  return buildPlayerCountBuckets(value).map((bucket) => ({
    key: `${bucket.key}-summary`,
    label: bucket.label,
    value: `${bucket.wins}W | ${Math.max(bucket.games - bucket.wins, 0)}L | ${Math.round((bucket.wins / bucket.games) * 100)}% win rate`,
    detail: joinParts([
      `${bucket.games} ${pluralize(bucket.games, "game")}`,
      bucket.avgPrestige !== null ? `${formatNumber(bucket.avgPrestige)} avg prestige` : null,
      bucket.avgAssists !== null ? `${formatNumber(bucket.avgAssists)} avg assists` : null,
      bucket.avgFailures !== null ? `${formatNumber(bucket.avgFailures)} avg failures` : null,
    ]),
  }));
}
