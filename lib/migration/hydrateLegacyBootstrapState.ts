type LegacyBootstrapState = {
  players: unknown[];
  groups: unknown[];
  games: unknown[];
};

type LegacyBootstrapSummary = {
  playerCount: number;
  groupCount: number;
  gameCount: number;
};

type HydrateLegacyBootstrapStateInput = {
  getCurrentState: () => LegacyBootstrapState;
  loadStoredState: () => Promise<LegacyBootstrapState>;
  applyState: (snapshot: LegacyBootstrapState) => void | Promise<void>;
  restoreBackupIntoStore: () => Promise<{ restored: boolean; count: number }>;
};

type HydrateLegacyBootstrapStateResult = {
  source: "memory" | "storage" | "backup" | "empty";
  state: LegacyBootstrapState;
  summary: LegacyBootstrapSummary;
};

function toArray(value: unknown) {
  return Array.isArray(value) ? [...value] : [];
}

function normalizeState(value: Partial<LegacyBootstrapState> | null | undefined): LegacyBootstrapState {
  return {
    players: toArray(value?.players),
    groups: toArray(value?.groups),
    games: toArray(value?.games),
  };
}

function summarizeState(state: LegacyBootstrapState): LegacyBootstrapSummary {
  return {
    playerCount: state.players.length,
    groupCount: state.groups.length,
    gameCount: state.games.length,
  };
}

function hasLegacyData(summary: LegacyBootstrapSummary) {
  return summary.playerCount > 0 || summary.groupCount > 0 || summary.gameCount > 0;
}

export async function hydrateLegacyBootstrapState(
  input: HydrateLegacyBootstrapStateInput,
): Promise<HydrateLegacyBootstrapStateResult> {
  const memoryState = normalizeState(input.getCurrentState());
  const memorySummary = summarizeState(memoryState);

  if (hasLegacyData(memorySummary)) {
    return {
      source: "memory",
      state: memoryState,
      summary: memorySummary,
    };
  }

  let storageError: unknown;

  try {
    const storedState = normalizeState(await input.loadStoredState());
    const storedSummary = summarizeState(storedState);

    if (hasLegacyData(storedSummary)) {
      await input.applyState(storedState);
      return {
        source: "storage",
        state: storedState,
        summary: storedSummary,
      };
    }
  } catch (error) {
    storageError = error;
  }

  const backupResult = await input.restoreBackupIntoStore();
  if (backupResult.restored) {
    const backupState = normalizeState(input.getCurrentState());
    const backupSummary = summarizeState(backupState);

    if (hasLegacyData(backupSummary)) {
      return {
        source: "backup",
        state: backupState,
        summary: backupSummary,
      };
    }
  }

  if (storageError) {
    throw storageError;
  }

  return {
    source: "empty",
    state: normalizeState(null),
    summary: summarizeState(normalizeState(null)),
  };
}
