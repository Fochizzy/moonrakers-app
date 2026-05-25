import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { useCallback, useEffect, useReducer, useRef } from "react";

export function useAnalyticsRefreshTick() {
  const [refreshTick, bumpRefreshTick] = useReducer(
    (current: number) => current + 1,
    0,
  );
  const hasFocusedOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnceRef.current) {
        bumpRefreshTick();
      } else {
        hasFocusedOnceRef.current = true;
      }
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && hasFocusedOnceRef.current) {
        bumpRefreshTick();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return refreshTick;
}
