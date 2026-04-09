type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
};

type GameLike = {
  totals?: Record<string, any>;
};

export type Relationships = Record<string, Record<string, number>>;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getAssistSourceMap(entry?: Record<string, any>): Record<string, number> {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return {};
  }

  const candidates = [
    entry.assistPrestigeByPlayer,
    entry.assistPrestigeFromPlayers,
    entry.assistSources,
    entry.assistPrestigeBySource,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const out: Record<string, number> = {};

      for (const [sourceId, rawValue] of Object.entries(candidate)) {
        const value = toNumber(rawValue);
        if (value > 0) {
          out[sourceId] = value;
        }
      }

      if (Object.keys(out).length > 0) {
        return out;
      }
    }
  }

  return {};
}

/**
 * relationships[A][B] = support / assist prestige SENT from A to B
 *
 * IMPORTANT:
 * The source maps live on the recipient-side totals, so we reverse:
 * recipient <- source  ==>  source -> recipient
 */
export function buildRelationshipData(
  playersInput: PlayerLike[] = [],
  gamesInput: GameLike[] = []
): Relationships {
  const players = Array.isArray(playersInput) ? playersInput : [];
  const games = Array.isArray(gamesInput) ? gamesInput : [];

  const relationships: Relationships = {};

  for (const player of players) {
    const playerId = String(player?.id ?? "").trim();
    if (!playerId) continue;
    relationships[playerId] = {};
  }

  for (const game of games) {
    const totals = game?.totals;
    if (!totals || typeof totals !== "object" || Array.isArray(totals)) {
      continue;
    }

    for (const [recipientIdRaw, rawEntry] of Object.entries(totals)) {
      const recipientId = String(recipientIdRaw ?? "").trim();
      if (!recipientId) continue;

      const entry =
        rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry)
          ? (rawEntry as Record<string, any>)
          : undefined;

      if (!entry) continue;

      const sourceMap = getAssistSourceMap(entry);

      for (const [sourceIdRaw, amountRaw] of Object.entries(sourceMap)) {
        const sourceId = String(sourceIdRaw ?? "").trim();
        const amount = toNumber(amountRaw);

        if (!sourceId || sourceId === recipientId || amount <= 0) {
          continue;
        }

        if (!relationships[sourceId]) {
          relationships[sourceId] = {};
        }

        relationships[sourceId][recipientId] =
          toNumber(relationships[sourceId][recipientId]) + amount;
      }
    }
  }

  return relationships;
}