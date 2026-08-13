import {
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

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
