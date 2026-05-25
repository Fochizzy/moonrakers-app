import { create } from "zustand";

import {
  createAppStatusRecord,
  type AppStatusDraft,
  type AppStatusRecord,
  type AppStatusScope,
} from "./types.ts";

type AppStatusStore = {
  current: AppStatusRecord | null;
  history: AppStatusRecord[];
  publishStatus: (input: AppStatusDraft | AppStatusRecord) => AppStatusRecord;
  clearStatus: (scope?: AppStatusScope | null) => void;
};

export const useAppStatusStore = create<AppStatusStore>((set, get) => ({
  current: null,
  history: [],
  publishStatus: (input) => {
    const record =
      "timestamp" in input && typeof input.timestamp === "number"
        ? input
        : createAppStatusRecord(input);

    set((state) => ({
      current: record,
      history: [record, ...state.history.filter((entry) => entry.id !== record.id)].slice(0, 8),
    }));

    return record;
  },
  clearStatus: (scope) => {
    if (!scope) {
      set({ current: null });
      return;
    }

    const current = get().current;
    if (current?.scope === scope) {
      set({ current: null });
    }
  },
}));

export function publishAppStatus(input: AppStatusDraft | AppStatusRecord) {
  return useAppStatusStore.getState().publishStatus(input);
}

export function clearAppStatus(scope?: AppStatusScope | null) {
  useAppStatusStore.getState().clearStatus(scope ?? null);
}

export function useCurrentAppStatus() {
  return useAppStatusStore((state) => state.current);
}

export function usePublishAppStatus() {
  return useAppStatusStore((state) => state.publishStatus);
}

export function useClearAppStatus() {
  return useAppStatusStore((state) => state.clearStatus);
}
