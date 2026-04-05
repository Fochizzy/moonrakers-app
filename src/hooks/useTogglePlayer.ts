// hooks/useTogglePlayer.ts

import { useCallback } from 'react';
import { useStore } from '@/store/useStore';

// -----------------------------
// 🧠 Hook
// -----------------------------
export function useTogglePlayer() {
  const selected = useStore((s) => s.selectedPlayers);
  const setSelected = useStore((s) => s.setSelectedPlayers);

  const togglePlayer = useCallback(
    (id: string) => {
      setSelected((prev: string[]) => {
        if (prev.includes(id)) {
          return prev.filter((p) => p !== id);
        }
        return [...prev, id];
      });
    },
    [setSelected]
  );

  return togglePlayer;
}
