import { Game } from "@/store/useStore";

export type ResolvedChartPlayer = {
  id: string;
  name: string;
  initials: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
  score: number;
  totalPrestige: number;
  prestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  objectivePrestige: number;
  assists: number;
  contracts: number;
  failures: number;
  turns: number;
};

type ResolvedTotals = {
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistPrestigeByPlayer?: Record<string, number>;
  assistPrestigeFromPlayers?: Record<string, number>;
  assistSources?: Record<string, number>;
  objectivePrestige?: number;
  objectiveCount?: number;
  assists?: number;
  contracts?: number;
  failures?: number;
  turns?: number;
  turnCount?: number;
};

function safeNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

function ensureObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizeLooseName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

function getInitials(player: any): string {
  if (typeof player?.initials === "string" && player.initials.trim()) {
    return player.initials.trim().charAt(0).toUpperCase();
  }
  return String(player?.name ?? "").trim().charAt(0).toUpperCase() || "?";
}

function totalPrestigeFromTotals(totals: ResolvedTotals) {
  return (
    safeNumber(totals.totalPrestige) ||
    safeNumber(totals.prestige) ||
    safeNumber(totals.directPrestige) +
      safeNumber(totals.assistPrestigeReceived) +
      safeNumber(totals.objectivePrestige ?? totals.objectiveCount)
  );
}

function normalizeAssistMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const out: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = String(rawKey ?? "").trim();
    if (!key) continue;
    out[key] = safeNumber(rawValue);
  }
  return out;
}

function remapAssistMap(
  value: unknown,
  idMap: Record<string, string>
): Record<string, number> {
  const source = normalizeAssistMap(value);
  const out: Record<string, number> = {};

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const mappedKey = idMap[String(rawKey)] ?? String(rawKey);
    out[mappedKey] = safeNumber(out[mappedKey]) + safeNumber(rawValue);
  }

  return out;
}

function mergeAssistMaps(
  ...maps: Array<Record<string, number> | undefined>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map ?? {})) {
      out[key] = safeNumber(out[key]) + safeNumber(value);
    }
  }
  return out;
}

function buildResolvedPlayer(
  player: any,
  totals: ResolvedTotals,
  turns: number
): ResolvedChartPlayer {
  const totalPrestige = totalPrestigeFromTotals(totals);

  return {
    id: String(player?.id ?? ""),
    name: String(player?.name ?? "Player"),
    initials: getInitials(player),
    color: player?.color,
    assignedCardArtIndex:
      typeof player?.assignedCardArtIndex === "number" &&
      Number.isFinite(player.assignedCardArtIndex)
        ? player.assignedCardArtIndex
        : null,
    artIndex:
      typeof player?.artIndex === "number" && Number.isFinite(player.artIndex)
        ? player.artIndex
        : null,
    score: safeNumber(totals.score) || totalPrestige,
    totalPrestige,
    prestige: safeNumber(totals.prestige) || totalPrestige,
    directPrestige: safeNumber(totals.directPrestige),
    assistPrestigeReceived: safeNumber(totals.assistPrestigeReceived),
    objectivePrestige: safeNumber(
      totals.objectivePrestige ?? totals.objectiveCount
    ),
    assists: safeNumber(totals.assists),
    contracts: safeNumber(totals.contracts),
    failures: safeNumber(totals.failures),
    turns,
  };
}

function mergeTotalsEntry(
  existing: ResolvedTotals | undefined,
  incoming: ResolvedTotals
): ResolvedTotals {
  const a = ensureObject(existing) as ResolvedTotals;
  const b = ensureObject(incoming) as ResolvedTotals;

  const directPrestige = safeNumber(a.directPrestige) + safeNumber(b.directPrestige);
  const assistPrestigeReceived =
    safeNumber(a.assistPrestigeReceived) + safeNumber(b.assistPrestigeReceived);
  const objectivePrestige =
    safeNumber(a.objectivePrestige ?? a.objectiveCount) +
    safeNumber(b.objectivePrestige ?? b.objectiveCount);
  const turns = safeNumber(a.turns ?? a.turnCount) + safeNumber(b.turns ?? b.turnCount);
  const totalPrestige = directPrestige + assistPrestigeReceived + objectivePrestige;

  return {
    ...a,
    ...b,
    score: safeNumber(a.score) + safeNumber(b.score),
    totalPrestige,
    prestige: totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeSent:
      safeNumber(a.assistPrestigeSent) + safeNumber(b.assistPrestigeSent),
    objectivePrestige,
    objectiveCount: objectivePrestige,
    assists: safeNumber(a.assists) + safeNumber(b.assists),
    contracts: safeNumber(a.contracts) + safeNumber(b.contracts),
    failures: safeNumber(a.failures) + safeNumber(b.failures),
    turns,
    turnCount: turns,
    assistPrestigeBySource: mergeAssistMaps(
      a.assistPrestigeBySource,
      b.assistPrestigeBySource
    ),
    assistPrestigeByPlayer: mergeAssistMaps(
      a.assistPrestigeByPlayer,
      b.assistPrestigeByPlayer
    ),
    assistPrestigeFromPlayers: mergeAssistMaps(
      a.assistPrestigeFromPlayers,
      b.assistPrestigeFromPlayers
    ),
    assistSources: mergeAssistMaps(a.assistSources, b.assistSources),
  };
}

function normalizeTotalsEntry(
  entry: any,
  rawPlayerId: string,
  canonicalPlayerId: string,
  idMap: Record<string, string>
): ResolvedTotals {
  const directPrestige = safeNumber(entry?.directPrestige);
  const assistPrestigeReceived = safeNumber(entry?.assistPrestigeReceived);
  const objectivePrestige = safeNumber(
    entry?.objectivePrestige ?? entry?.objectiveCount
  );
  const totalPrestige =
    safeNumber(entry?.totalPrestige) ||
    safeNumber(entry?.prestige) ||
    directPrestige + assistPrestigeReceived + objectivePrestige;
  const turns = safeNumber(entry?.turns ?? entry?.turnCount);

  const remappedAssistMap = remapAssistMap(
    entry?.assistPrestigeBySource ??
      entry?.assistPrestigeByPlayer ??
      entry?.assistPrestigeFromPlayers ??
      entry?.assistSources,
    idMap
  );

  return {
    ...entry,
    rawPlayerId,
    canonicalPlayerId,
    score: safeNumber(entry?.score) || totalPrestige,
    totalPrestige,
    prestige: safeNumber(entry?.prestige) || totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeSent: safeNumber(entry?.assistPrestigeSent),
    objectivePrestige,
    objectiveCount: objectivePrestige,
    assists: safeNumber(entry?.assists),
    contracts: safeNumber(entry?.contracts),
    failures: safeNumber(entry?.failures),
    turns,
    turnCount: turns,
    assistPrestigeBySource: remappedAssistMap,
    assistPrestigeByPlayer: remappedAssistMap,
    assistPrestigeFromPlayers: remappedAssistMap,
    assistSources: remappedAssistMap,
  };
}

function findTotalsEntry(
  player: any,
  players: any[],
  totalsMap: Record<string, any>
): ResolvedTotals {
  const playerId = String(player?.id ?? "").trim();
  if (playerId && totalsMap[playerId]) {
    return ensureObject(totalsMap[playerId]) as ResolvedTotals;
  }

  const nameKey = normalizeLooseName(player?.name);
  if (nameKey) {
    const directByName = Object.entries(totalsMap).find(([, entry]) => {
      const e = ensureObject(entry);
      return normalizeLooseName(e?.name ?? e?.playerName) === nameKey;
    });

    if (directByName) {
      return ensureObject(directByName[1]) as ResolvedTotals;
    }
  }

  for (const gamePlayer of players) {
    const gamePlayerId = String(gamePlayer?.id ?? "").trim();
    if (playerId && gamePlayerId === playerId && totalsMap[gamePlayerId]) {
      return ensureObject(totalsMap[gamePlayerId]) as ResolvedTotals;
    }

    if (
      nameKey &&
      normalizeLooseName(gamePlayer?.name) === nameKey &&
      gamePlayerId &&
      totalsMap[gamePlayerId]
    ) {
      return ensureObject(totalsMap[gamePlayerId]) as ResolvedTotals;
    }
  }

  return {};
}

function inferTurnsForPlayer(game: any, rawPlayerId: string, canonicalPlayerId: string): number {
  const totalsTurns = safeNumber(
    game?.totals?.[canonicalPlayerId]?.turns ?? game?.totals?.[canonicalPlayerId]?.turnCount
  );
  if (totalsTurns > 0) return totalsTurns;

  const rounds = Array.isArray(game?.rounds) ? game.rounds : [];
  const roundTurns = rounds.filter((round) => {
    const roundPlayerId = String(round?.playerId ?? "").trim();
    return roundPlayerId === canonicalPlayerId || roundPlayerId === rawPlayerId;
  }).length;

  return roundTurns;
}

function buildCanonicalPlayerMap(games: Game[]): ResolvedChartPlayer[] {
  const byId = new Map<string, ResolvedChartPlayer>();
  const byName = new Map<string, string>();

  for (const game of Array.isArray(games) ? games : []) {
    const players = Array.isArray(game?.players) ? game.players : [];
    const totalsMap = ensureObject(game?.totals);

    for (const player of players) {
      const rawId = String(player?.id ?? "").trim();
      const name = String(player?.name ?? "Player").trim() || "Player";
      const nameKey = normalizeLooseName(name);

      const existingCanonicalId =
        (rawId && byId.has(rawId) && rawId) ||
        (nameKey && byName.get(nameKey)) ||
        rawId ||
        `player-${byId.size + 1}`;

      const entry = findTotalsEntry(player, players, totalsMap);
      const incoming = buildResolvedPlayer(
        {
          ...player,
          id: existingCanonicalId,
          name,
          initials: getInitials(player),
        },
        entry,
        inferTurnsForPlayer(game, rawId, existingCanonicalId)
      );

      const merged = byId.has(existingCanonicalId)
        ? buildResolvedPlayer(
            {
              ...byId.get(existingCanonicalId),
              ...incoming,
              id: existingCanonicalId,
              name: byId.get(existingCanonicalId)?.name || incoming.name,
              initials:
                byId.get(existingCanonicalId)?.initials || incoming.initials,
            },
            mergeTotalsEntry(byId.get(existingCanonicalId), incoming),
            safeNumber(byId.get(existingCanonicalId)?.turns) + safeNumber(incoming.turns)
          )
        : incoming;

      byId.set(existingCanonicalId, merged);
      if (nameKey && !byName.has(nameKey)) {
        byName.set(nameKey, existingCanonicalId);
      }
    }
  }

  return [...byId.values()].sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""))
  );
}

export function resolveAllGamesToPlayers(games: Game[]): ResolvedChartPlayer[] {
  return buildCanonicalPlayerMap(Array.isArray(games) ? games : []);
}

export function canonicalizeImportedGamesForCharts(
  games: Game[],
  canonicalPlayers?: Array<{
    id: string;
    name?: string;
    initials?: string;
    color?: string;
    assignedCardArtIndex?: number | null;
    artIndex?: number | null;
  }>
): Game[] {
  const players =
    Array.isArray(canonicalPlayers) && canonicalPlayers.length > 0
      ? canonicalPlayers
      : resolveAllGamesToPlayers(games);

  const byId = new Map<string, any>();
  const byName = new Map<string, any>();

  for (const player of players) {
    const id = String(player?.id ?? "").trim();
    const nameKey = normalizeLooseName(player?.name);
    if (id) byId.set(id, player);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, player);
  }

  return (Array.isArray(games) ? games : []).map((game) => {
    const rawPlayers = Array.isArray(game?.players) ? game.players : [];
    const rawTotals = ensureObject(game?.totals);
    const idMap: Record<string, string> = {};
    const canonicalPlayersForGame: any[] = [];
    const canonicalTotals: Record<string, any> = {};

    for (const rawPlayer of rawPlayers) {
      const rawId = String(rawPlayer?.id ?? "").trim();
      const rawNameKey = normalizeLooseName(rawPlayer?.name);
      const directTotals = ensureObject(rawTotals[rawId]);

      const matched =
        (rawId && byId.get(rawId)) ||
        (rawNameKey && byName.get(rawNameKey)) ||
        (normalizeLooseName(directTotals?.name ?? directTotals?.playerName) &&
          byName.get(normalizeLooseName(directTotals?.name ?? directTotals?.playerName))) ||
        null;

      const canonicalId = String(matched?.id ?? rawId).trim() || rawId;
      idMap[rawId] = canonicalId;
      const rawPlayerWithArt = rawPlayer as typeof rawPlayer & {
        artIndex?: number | null;
      };

      canonicalPlayersForGame.push({
        ...rawPlayer,
        id: canonicalId,
        name: String(matched?.name ?? rawPlayer?.name ?? "Player"),
        initials: String(
          matched?.initials ?? rawPlayer?.initials ?? getInitials(rawPlayer)
        ),
        color: matched?.color ?? rawPlayer?.color,
        assignedCardArtIndex:
          typeof matched?.assignedCardArtIndex === "number"
            ? matched.assignedCardArtIndex
            : rawPlayer?.assignedCardArtIndex ?? null,
        artIndex:
          typeof matched?.artIndex === "number"
            ? matched.artIndex
            : rawPlayerWithArt.artIndex ?? null,
      });
    }

    for (const [rawPlayerId, rawEntry] of Object.entries(rawTotals)) {
      const entry = ensureObject(rawEntry);
      const linkedPlayer =
        rawPlayers.find((player) => String(player?.id ?? "") === String(rawPlayerId)) ?? null;

      const matched =
        (String(rawPlayerId).trim() && byId.get(String(rawPlayerId).trim())) ||
        (linkedPlayer && byName.get(normalizeLooseName(linkedPlayer?.name))) ||
        (normalizeLooseName(entry?.name ?? entry?.playerName) &&
          byName.get(normalizeLooseName(entry?.name ?? entry?.playerName))) ||
        null;

      const canonicalId = String(
        matched?.id ?? idMap[String(rawPlayerId)] ?? String(rawPlayerId)
      ).trim();

      idMap[String(rawPlayerId)] = canonicalId;

      const normalizedEntry = normalizeTotalsEntry(
        entry,
        String(rawPlayerId),
        canonicalId,
        idMap
      );

      canonicalTotals[canonicalId] = mergeTotalsEntry(
        canonicalTotals[canonicalId],
        normalizedEntry
      );
    }

    const remapRoundList = (list: any[]) =>
      (Array.isArray(list) ? list : []).map((round: any, index: number) => ({
        ...round,
        id: String(round?.id ?? `round-${index + 1}`),
        playerId: idMap[String(round?.playerId ?? "")] ?? String(round?.playerId ?? ""),
        assistRecipients: remapAssistMap(round?.assistRecipients, idMap),
        assistPrestigeRecipients: remapAssistMap(
          round?.assistPrestigeRecipients,
          idMap
        ),
      }));

    const remapWinnerId = (value: unknown) => {
      const raw = String(value ?? "").trim();
      if (!raw) return undefined;
      return idMap[raw] ?? raw;
    };

    const dedupedPlayers = new Map<string, any>();
    for (const player of canonicalPlayersForGame) {
      if (!dedupedPlayers.has(String(player.id))) {
        dedupedPlayers.set(String(player.id), player);
      }
    }

    for (const [playerId, totals] of Object.entries(canonicalTotals)) {
      if (!dedupedPlayers.has(playerId)) {
        const matched = byId.get(playerId);
        dedupedPlayers.set(playerId, {
          id: playerId,
          name: String(matched?.name ?? (totals as any)?.name ?? "Player"),
          initials: String(
            matched?.initials ?? getInitials({ name: matched?.name ?? (totals as any)?.name })
          ),
          color: matched?.color,
          assignedCardArtIndex:
            typeof matched?.assignedCardArtIndex === "number"
              ? matched.assignedCardArtIndex
              : null,
          artIndex:
            typeof matched?.artIndex === "number"
              ? matched.artIndex
              : null,
        });
      }
    }

    const rounds = remapRoundList(Array.isArray(game?.rounds) ? game.rounds : []);
    const timelineSource =
      Array.isArray(game?.timeline) && game.timeline.length > 0
        ? game.timeline
        : rounds;

    const timeline = remapRoundList(timelineSource);

    return {
      ...game,
      players: [...dedupedPlayers.values()],
      totals: canonicalTotals,
      rounds,
      timeline,
      winnerId: remapWinnerId((game as any)?.winnerId),
      selectedWinnerId: remapWinnerId((game as any)?.selectedWinnerId),
      manualWinnerId: remapWinnerId((game as any)?.manualWinnerId),
    };
  });
}
