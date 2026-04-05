import {
  useEffect,
  useRef,
  type DependencyList,
} from 'react';

type Change = {
  index: number;
  label?: string;
  prev: unknown;
  next: unknown;
};

type Options = {
  enabled?: boolean;
  deps?: DependencyList;
  depLabels?: string[]; // optional names for deps
  logOnMount?: boolean;
  collapse?: boolean; // console.groupCollapsed
  trackChanges?: boolean;
  trackTime?: boolean;
  logger?: (payload: {
    name: string;
    count: number;
    changes: Change[];
    duration?: number;
  }) => void;
};

const isDev =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production';

function diffDeps(
  prev: DependencyList,
  next: DependencyList,
  labels?: string[]
): Change[] {
  const len = Math.max(prev.length, next.length);
  const changes: Change[] = [];

  for (let i = 0; i < len; i++) {
    if (!Object.is(prev[i], next[i])) {
      changes.push({
        index: i,
        label: labels?.[i],
        prev: prev[i],
        next: next[i],
      });
    }
  }

  return changes;
}

export function useRenderDebug(
  name: string,
  {
    enabled = isDev,
    deps,
    depLabels,
    logOnMount = true,
    collapse = true,
    trackChanges = true,
    trackTime = false,
    logger,
  }: Options = {}
) {
  const renderCount = useRef(0);
  const isFirst = useRef(true);
  const prevDeps = useRef<DependencyList | null>(null);
  const startTime = useRef<number>(0);

  // ⏱️ mark render start
  if (trackTime) {
    startTime.current = performance.now();
  }

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;

    if (!logOnMount && isFirst.current) {
      isFirst.current = false;
      prevDeps.current = deps ?? null;
      return;
    }

    let changes: Change[] = [];

    if (trackChanges && deps && prevDeps.current) {
      changes = diffDeps(prevDeps.current, deps, depLabels);
    }

    const duration = trackTime
      ? performance.now() - startTime.current
      : undefined;

    if (logger) {
      logger({
        name,
        count: renderCount.current,
        changes,
        duration,
      });
    } else {
      const header = `🔁 ${name} #${renderCount.current}`;

      if (collapse) {
        console.groupCollapsed(header);
      } else {
        console.log(header);
      }

      if (duration != null) {
        console.log(`⏱ ${duration.toFixed(2)}ms`);
      }

      if (changes.length > 0) {
        console.table(
          changes.map((c) => ({
            dep: c.label ?? `#${c.index}`,
            prev: c.prev,
            next: c.next,
          }))
        );
      } else if (deps) {
        console.log('No dependency changes');
      }

      if (collapse) {
        console.groupEnd();
      }
    }

    prevDeps.current = deps ?? null;
    isFirst.current = false;
  }, deps ?? []);
}
