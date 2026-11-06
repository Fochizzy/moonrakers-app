import { isPlayerNameAvailable } from "@/lib/cloud/playerAccess";
import { useUsernameLookup } from "@/lib/cloud/useUsernameLookup";

export type NameAvailability = "idle" | "checking" | "free" | "taken";

/**
 * Both username namespaces are global and neither is browsable, so a collision
 * can only be discovered by submitting -- and the name it collides with belongs
 * to a table you may never have sat at. Asking while the field is still being
 * typed is the only way to make "that username is already taken" actionable.
 */
export function useNameAvailability(username: string): NameAvailability {
  const lookup = useUsernameLookup(username, isPlayerNameAvailable);

  if (lookup.status === "done") {
    return lookup.value ? "free" : "taken";
  }

  if (lookup.status === "checking") {
    return "checking";
  }

  // A lookup that cannot run must not block a name that may be fine; the
  // server still has the final say on submit.
  return "idle";
}
