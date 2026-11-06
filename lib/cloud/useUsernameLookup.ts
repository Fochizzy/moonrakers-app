import { useEffect, useState } from "react";

import { isValidPlayerUsername } from "@/lib/cloud/playerAccess";

export type UsernameLookup<T> =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "done"; value: T }
  | { status: "error" };

const IDLE = { status: "idle" } as const;
const LOOKUP_DEBOUNCE_MS = 350;

/**
 * Asks the server about a username once typing pauses, and drops answers for
 * text the field no longer holds.
 *
 * A lookup that cannot run reports "error" rather than an answer. Callers have
 * to decide what an unknown means for them, and they need opposite things: a
 * name check must not block a name that may be fine, while a claim must not
 * mistake "could not ask" for "no such guest".
 */
export function useUsernameLookup<T>(
  username: string,
  lookup: (username: string) => Promise<T>,
): UsernameLookup<T> {
  const key = username.trim();
  const [state, setState] = useState<UsernameLookup<T>>(IDLE);

  useEffect(() => {
    if (!isValidPlayerUsername(key)) {
      setState(IDLE);
      return undefined;
    }

    let active = true;
    setState({ status: "checking" });

    const timer = setTimeout(() => {
      lookup(key)
        .then((value) => {
          if (active) {
            setState({ status: "done", value });
          }
        })
        .catch(() => {
          if (active) {
            setState({ status: "error" });
          }
        });
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, lookup]);

  return state;
}
