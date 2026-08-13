import {
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { reconcileStaleRollupOnce } from "./reconcileStaleRollup";
import { useAnalyticsRefreshTick } from "./useAnalyticsRefreshTick";
import {
  beginLiveAnalyticsRequest,
  createLiveAnalyticsQueryState,
  resolveLiveAnalyticsFailure,
  resolveLiveAnalyticsSuccess,
} from "./createLiveAnalyticsQuery";
import type { LiveAnalyticsQueryState } from "./types.ts";

type UseLiveAnalyticsQueryArgs<TPayload> = {
  enabled: boolean;
  queryKey: string;
  load: () => Promise<TPayload>;
};

type UseLiveAnalyticsQueryResult<TPayload> = LiveAnalyticsQueryState<TPayload> & {
  refresh: () => void;
};

export function useLiveAnalyticsQuery<TPayload>({
  enabled,
  queryKey,
  load,
}: UseLiveAnalyticsQueryArgs<TPayload>): UseLiveAnalyticsQueryResult<TPayload> {
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const [manualRefreshTick, triggerManualRefresh] = useReducer(
    (current: number) => current + 1,
    0,
  );
  const loadRef = useRef(load);
  const [state, setState] = useState<LiveAnalyticsQueryState<TPayload>>(() =>
    createLiveAnalyticsQueryState<TPayload>(queryKey),
  );

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      setState(createLiveAnalyticsQueryState<TPayload>(queryKey));
      return;
    }

    let cancelled = false;

    setState((current) => beginLiveAnalyticsRequest(current, queryKey));

    void (async () => {
      try {
        // Repair a rollup the finish-game flow failed to refresh before reading it,
        // so the first analytics load of the session shows current numbers rather
        // than healing only in time for the next one. No-ops once per session, and
        // costs a single count query when the rollup is already current.
        await reconcileStaleRollupOnce();

        if (cancelled) {
          return;
        }

        const nextPayload = await loadRef.current();

        if (cancelled) {
          return;
        }

        setState((current) => {
          if (current.queryKey !== queryKey) {
            return current;
          }

          return resolveLiveAnalyticsSuccess(current, nextPayload);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : String(error ?? "Failed to load analytics.");

        setState((current) => {
          if (current.queryKey !== queryKey) {
            return current;
          }

          return resolveLiveAnalyticsFailure(current, message);
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    analyticsRefreshTick,
    enabled,
    manualRefreshTick,
    queryKey,
  ]);

  return {
    ...state,
    refresh: triggerManualRefresh,
  };
}
