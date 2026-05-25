export type SessionTurnState = {
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
};

export type SessionRound = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
  objectivePrestige: number;
  createdAt: number;
  metaType?: "main" | "bonusObjective";
  linkedTurnId?: string;
};

type SubmitRoundCandidateInput = {
  activeTurnPlayerId: string;
  current: SessionTurnState;
  existingRounds: SessionRound[];
  objectiveAwardsByPlayer: Record<string, number>;
  now?: () => number;
  createRoundId?: (playerId: string, createdAt: number) => string;
};

type EditRoundCandidateInput = {
  editingRoundId: string;
  current: SessionTurnState;
  existingRounds: SessionRound[];
  objectiveAwardsByPlayer: Record<string, number>;
  now?: () => number;
  createRoundId?: (playerId: string, createdAt: number) => string;
};

type FinishGameStateInput<TGamePlayer extends Record<string, unknown>> = {
  activeGame: Record<string, unknown>;
  players: TGamePlayer[];
  rounds: SessionRound[];
  winnerId: string | null;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampBinary(value: unknown): 0 | 1 {
  return toNumber(value) > 0 ? 1 : 0;
}

function clampObjectiveCount(value: unknown): number {
  return Math.max(0, Math.floor(toNumber(value)));
}

export function sanitizeCurrentTurnForRound(source: SessionTurnState): SessionTurnState {
  const assistRecipients = Object.fromEntries(
    Object.entries(source.assistRecipients ?? {}).filter(([, value]) => toNumber(value) > 0),
  ) as Record<string, number>;

  const assistPrestigeRecipients = Object.fromEntries(
    Object.entries(source.assistPrestigeRecipients ?? {}).filter(
      ([playerId]) => toNumber(assistRecipients[playerId]) > 0,
    ),
  ) as Record<string, number>;

  return {
    prestige: toNumber(source.prestige),
    contracts: clampBinary(source.contracts),
    failures: clampBinary(source.failures),
    assistRecipients,
    assistPrestigeRecipients,
    objectiveCount: clampObjectiveCount(source.objectiveCount),
  };
}

function createSessionRound(args: {
  playerId: string;
  current: SessionTurnState;
  createdAt: number;
  createRoundId?: (playerId: string, createdAt: number) => string;
}): SessionRound {
  return {
    id: args.createRoundId
      ? args.createRoundId(args.playerId, args.createdAt)
      : `${args.playerId}-${args.createdAt}`,
    playerId: args.playerId,
    prestige: toNumber(args.current.prestige),
    contracts: clampBinary(args.current.contracts),
    failures: clampBinary(args.current.failures),
    assistRecipients: { ...(args.current.assistRecipients ?? {}) },
    assistPrestigeRecipients: { ...(args.current.assistPrestigeRecipients ?? {}) },
    objectiveCount: clampObjectiveCount(args.current.objectiveCount),
    objectivePrestige: clampObjectiveCount(args.current.objectiveCount),
    createdAt: args.createdAt,
  };
}

export function createObjectiveBonusRounds(args: {
  linkedTurnId: string;
  objectiveAwardsByPlayer: Record<string, number>;
  now?: () => number;
  createRoundId?: (playerId: string, createdAt: number) => string;
}): SessionRound[] {
  const now = args.now ?? Date.now;
  const bonusRounds: SessionRound[] = [];

  for (const [playerId, count] of Object.entries(args.objectiveAwardsByPlayer ?? {})) {
    const objectiveCount = clampObjectiveCount(count);
    if (!playerId || objectiveCount <= 0) {
      continue;
    }

    const createdAt = now();
    bonusRounds.push({
      id: args.createRoundId
        ? args.createRoundId(`${playerId}-objective`, createdAt)
        : `${args.linkedTurnId}-obj-${playerId}`,
      playerId,
      prestige: 0,
      contracts: 0,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount,
      objectivePrestige: objectiveCount,
      createdAt,
      metaType: "bonusObjective",
      linkedTurnId: args.linkedTurnId,
    });
  }

  return bonusRounds;
}

export function buildSubmitRoundCandidate(
  input: SubmitRoundCandidateInput,
): { mainRound: SessionRound; nextRounds: SessionRound[] } {
  const now = input.now ?? Date.now;
  const createdAt = now();
  const mainRound = {
    ...createSessionRound({
      playerId: input.activeTurnPlayerId,
      current: sanitizeCurrentTurnForRound(input.current),
      createdAt,
      createRoundId: input.createRoundId,
    }),
    metaType: "main" as const,
  };

  const bonusRounds = createObjectiveBonusRounds({
    linkedTurnId: mainRound.id,
    objectiveAwardsByPlayer: input.objectiveAwardsByPlayer,
    now,
    createRoundId: input.createRoundId,
  });

  return {
    mainRound,
    nextRounds: [...input.existingRounds, mainRound, ...bonusRounds],
  };
}

export function buildEditRoundCandidate(
  input: EditRoundCandidateInput,
): { nextRounds: SessionRound[] } | null {
  const now = input.now ?? Date.now;
  const originalMainRound = input.existingRounds.find(
    (round) => round.id === input.editingRoundId,
  );

  if (!originalMainRound) {
    return null;
  }

  const replacementMainRound: SessionRound = {
    ...createSessionRound({
      playerId: originalMainRound.playerId,
      current: sanitizeCurrentTurnForRound(input.current),
      createdAt: originalMainRound.createdAt ?? now(),
      createRoundId: input.createRoundId,
    }),
    id: input.editingRoundId,
    metaType: "main",
  };

  const filteredRounds = input.existingRounds.filter(
    (round) => round.id !== input.editingRoundId && round.linkedTurnId !== input.editingRoundId,
  );

  const replacementBonusRounds = createObjectiveBonusRounds({
    linkedTurnId: input.editingRoundId,
    objectiveAwardsByPlayer: input.objectiveAwardsByPlayer,
    now,
    createRoundId: input.createRoundId,
  });

  return {
    nextRounds: [...filteredRounds, replacementMainRound, ...replacementBonusRounds].sort(
      (left, right) => toNumber(left.createdAt) - toNumber(right.createdAt),
    ),
  };
}

export function prepareFinishGameState<TGamePlayer extends Record<string, unknown>>(
  input: FinishGameStateInput<TGamePlayer>,
) {
  return {
    winnerId: input.winnerId,
    cloudGame: {
      ...input.activeGame,
      players: input.players,
      rounds: input.rounds,
      timeline: input.rounds,
      roundCount: input.rounds.length,
    },
  };
}
