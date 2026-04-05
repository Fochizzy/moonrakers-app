// store/slices/playerSlice.ts

export type PlayerColor =
  | 'Green'
  | 'Purple'
  | 'Blue'
  | 'Orange'
  | 'Yellow'
  | string;

export interface Player {
  id: string;
  name: string;
  color?: PlayerColor;
}

export interface PlayerSlice {
  players: Player[];

  addPlayer: (player: Player | { name: string; color?: string } | string) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  removePlayer: (id: string) => void;
  setPlayers: (players: Player[]) => void;
  clearPlayers: () => void;
}

const PLAYER_COLORS = ['Green', 'Purple', 'Blue', 'Orange', 'Yellow'] as const;

function makePlayerId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name: unknown): string {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeColor(color: unknown, index = 0): string {
  if (typeof color === 'string' && color.trim()) {
    return color.trim();
  }

  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

function normalizePlayer(
  input: Player | { name: string; color?: string } | string,
  existingCount = 0
): Player | null {
  if (typeof input === 'string') {
    const name = normalizeName(input);
    if (!name) return null;

    return {
      id: makePlayerId(),
      name,
      color: normalizeColor(undefined, existingCount),
    };
  }

  if (!input || typeof input !== 'object') {
    return null;
  }

  const name = normalizeName(input.name);
  if (!name) return null;

  const id =
    typeof (input as Player).id === 'string' && (input as Player).id.trim()
      ? (input as Player).id.trim()
      : makePlayerId();

  return {
    id,
    name,
    color: normalizeColor(input.color, existingCount),
  };
}

function dedupePlayers(players: Player[]): Player[] {
  const byId = new Map<string, Player>();

  for (const player of players) {
    if (!player?.id || !player?.name) continue;
    byId.set(player.id, player);
  }

  return Array.from(byId.values());
}

export const createPlayerSlice = (set: any): PlayerSlice => ({
  players: [],

  addPlayer: (playerInput) =>
    set((state: any) => {
      const players: Player[] = Array.isArray(state.players) ? state.players : [];
      const nextPlayer = normalizePlayer(playerInput, players.length);

      if (!nextPlayer) {
        return {};
      }

      const duplicateName = players.some(
        (player) =>
          normalizeName(player.name).toLowerCase() ===
          nextPlayer.name.toLowerCase()
      );

      if (duplicateName) {
        return {};
      }

      const duplicateId = players.some((player) => player.id === nextPlayer.id);

      if (duplicateId) {
        return {
          players: players.map((player) =>
            player.id === nextPlayer.id ? nextPlayer : player
          ),
        };
      }

      return {
        players: [...players, nextPlayer],
      };
    }),

  updatePlayer: (id, updates) =>
    set((state: any) => {
      const players: Player[] = Array.isArray(state.players) ? state.players : [];

      const nextName =
        updates.name !== undefined ? normalizeName(updates.name) : undefined;

      if (nextName !== undefined && !nextName) {
        return {};
      }

      const duplicateName =
        nextName !== undefined &&
        players.some(
          (player) =>
            player.id !== id &&
            normalizeName(player.name).toLowerCase() === nextName.toLowerCase()
        );

      if (duplicateName) {
        return {};
      }

      return {
        players: players.map((player, index) =>
          player.id === id
            ? {
                ...player,
                name: nextName ?? player.name,
                color:
                  updates.color !== undefined
                    ? normalizeColor(updates.color, index)
                    : player.color,
              }
            : player
        ),
      };
    }),

  deletePlayer: (id) =>
    set((state: any) => {
      const players: Player[] = Array.isArray(state.players) ? state.players : [];

      return {
        players: players.filter((player) => player.id !== id),
      };
    }),

  removePlayer: (id) =>
    set((state: any) => {
      const players: Player[] = Array.isArray(state.players) ? state.players : [];

      return {
        players: players.filter((player) => player.id !== id),
      };
    }),

  setPlayers: (nextPlayers) =>
    set(() => ({
      players: dedupePlayers(
        (Array.isArray(nextPlayers) ? nextPlayers : [])
          .map((player, index) => normalizePlayer(player, index))
          .filter((player): player is Player => Boolean(player))
      ),
    })),

  clearPlayers: () =>
    set({
      players: [],
    }),
});
