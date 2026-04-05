// store/slices/uiSlice.ts

export interface UISlice {
  selectedGroupId: string | null;

  selectGroup: (groupId: string | null) => void;
  clearSelectedGroup: () => void;
}

function normalizeGroupId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const createUISlice = (set: any): UISlice => ({
  selectedGroupId: null,

  selectGroup: (groupId) =>
    set({
      selectedGroupId: normalizeGroupId(groupId),
    }),

  clearSelectedGroup: () =>
    set({
      selectedGroupId: null,
    }),
});
