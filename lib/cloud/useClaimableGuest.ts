import {
  lookupClaimableGuest,
  type ClaimableGuestPreview,
} from "@/lib/cloud/playerAccess";
import { useUsernameLookup } from "@/lib/cloud/useUsernameLookup";

export type ClaimableGuestLookup =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; guest: ClaimableGuestPreview }
  | { status: "missing" }
  | { status: "error" };

/**
 * Claiming is one-way and cannot be replayed, so the guest is looked up and
 * shown back before the form will commit to it.
 *
 * "missing" means the server answered that no such guest exists. "error" means
 * it could not be asked, which is not the same thing: a claim form that treated
 * a dropped request as "no such guest" would strand the user with no way on.
 */
export function useClaimableGuest(username: string): ClaimableGuestLookup {
  const lookup = useUsernameLookup(username, lookupClaimableGuest);

  if (lookup.status === "done") {
    return lookup.value
      ? { status: "found", guest: lookup.value }
      : { status: "missing" };
  }

  return lookup;
}
