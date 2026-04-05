// store/slices/groupSlice.ts

export interface Group {
  id: string;
  name: string;
  playerIds: string[];
  createdAt: number;
}

export interface GroupSlice {
  groups: Group[];

  addGroup: (group: Group | { name: string; playerIds: string[] }) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  removeGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  setGroups: (groups: Group[]) => void;
  clearGroups: () => void;
}

function makeGroupId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name: unknown): string {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizePlayerIds(playerIds: unknown): string[] {
  if (!Array.isArray(playerIds)) return [];

  return Array.from(
    new Set(
      playerIds.filter(
        (id): id is string => typeof id === 'string' && !!id.trim()
      )
    )
  );
}

function samePlayers(a: string[], b: string[]) {
  if (a.length !== b.length) return false;

  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function normalizeGroup(
  input: Group | { name: string; playerIds: string[] }
): Group | null {
  if (!input || typeof input !== 'object') return null;

  const name = normalizeName(input.name);
  const playerIds = normalizePlayerIds(input.playerIds);

  if (!name || playerIds.length === 0) {
    return null;
  }

  const id =
    'id' in input && typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : makeGroupId();

  const createdAt =
    'createdAt' in input &&
    typeof input.createdAt === 'number' &&
    Number.isFinite(input.createdAt)
      ? input.createdAt
      : Date.now();

  return {
    id,
    name,
    playerIds,
    createdAt,
  };
}

function dedupeGroups(groups: Group[]): Group[] {
  const byId = new Map<string, Group>();

  for (const group of groups) {
    if (!group?.id || !group?.name || !Array.isArray(group.playerIds)) continue;
    byId.set(group.id, group);
  }

  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export const createGroupSlice = (set: any): GroupSlice => ({
  groups: [],

  addGroup: (groupInput) =>
    set((state: any) => {
      const groups: Group[] = Array.isArray(state.groups) ? state.groups : [];
      const nextGroup = normalizeGroup(groupInput);

      if (!nextGroup) {
        return {};
      }

      const duplicateId = groups.some((group) => group.id === nextGroup.id);
      if (duplicateId) {
        return {
          groups: groups.map((group) =>
            group.id === nextGroup.id ? nextGroup : group
          ),
        };
      }

      const duplicateName = groups.some(
        (group) => normalizeName(group.name).toLowerCase() === nextGroup.name.toLowerCase()
      );

      if (duplicateName) {
        return {};
      }

      const duplicatePlayers = groups.some((group) =>
        samePlayers(group.playerIds, nextGroup.playerIds)
      );

      if (duplicatePlayers) {
        return {};
      }

      return {
        groups: dedupeGroups([...groups, nextGroup]),
      };
    }),

  updateGroup: (groupId, updates) =>
    set((state: any) => {
      const groups: Group[] = Array.isArray(state.groups) ? state.groups : [];
      const current = groups.find((group) => group.id === groupId);

      if (!current) {
        return {};
      }

      const nextName =
        updates.name !== undefined ? normalizeName(updates.name) : current.name;

      const nextPlayerIds =
        updates.playerIds !== undefined
          ? normalizePlayerIds(updates.playerIds)
          : current.playerIds;

      if (!nextName || nextPlayerIds.length === 0) {
        return {};
      }

      const duplicateName = groups.some(
        (group) =>
          group.id !== groupId &&
          normalizeName(group.name).toLowerCase() === nextName.toLowerCase()
      );

      if (duplicateName) {
        return {};
      }

      const duplicatePlayers = groups.some(
        (group) =>
          group.id !== groupId && samePlayers(group.playerIds, nextPlayerIds)
      );

      if (duplicatePlayers) {
        return {};
      }

      return {
        groups: dedupeGroups(
          groups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  name: nextName,
                  playerIds: nextPlayerIds,
                  createdAt:
                    typeof updates.createdAt === 'number' &&
                    Number.isFinite(updates.createdAt)
                      ? updates.createdAt
                      : group.createdAt,
                }
              : group
          )
        ),
      };
    }),

  removeGroup: (groupId) =>
    set((state: any) => {
      const groups: Group[] = Array.isArray(state.groups) ? state.groups : [];

      return {
        groups: groups.filter((group) => group.id !== groupId),
      };
    }),

  deleteGroup: (groupId) =>
    set((state: any) => {
      const groups: Group[] = Array.isArray(state.groups) ? state.groups : [];

      return {
        groups: groups.filter((group) => group.id !== groupId),
      };
    }),

  setGroups: (nextGroups) =>
    set(() => ({
      groups: dedupeGroups(
        (Array.isArray(nextGroups) ? nextGroups : [])
          .map((group) => normalizeGroup(group))
          .filter((group): group is Group => Boolean(group))
      ),
    })),

  clearGroups: () =>
    set({
      groups: [],
    }),
});
