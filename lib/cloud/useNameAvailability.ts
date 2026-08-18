import { useEffect, useState } from "react";

import { isPlayerNameAvailable, isValidPlayerUsername } from "@/lib/cloud/playerAccess";

export type NameAvailability = "idle" | "checking" | "free" | "taken";

/**
 * Both username namespaces are global and neither is browsable, so a collision
 * can only be discovered by submitting -- and the name it collides with belongs
 * to a table you may never have sat at. Asking while the field is still being
 * typed is the only way to make "that username is already taken" actionable.
 */
export function useNameAvailability(username: string): NameAvailability {
  const [state, setState] = useState<NameAvailability>("idle");

  useEffect(() => {
    if (!isValidPlayerUsername(username)) {
      setState("idle");
      return undefined;
    }

    let active = true;
    setState("checking");

    const timer = setTimeout(() => {
      isPlayerNameAvailable(username)
        .then((available) => {
          if (active) {
            setState(available ? "free" : "taken");
          }
        })
        .catch(() => {
          // A lookup that cannot run must not block a name that may be fine;
          // the server still has the final say on submit.
          if (active) {
            setState("idle");
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username]);

  return state;
}
