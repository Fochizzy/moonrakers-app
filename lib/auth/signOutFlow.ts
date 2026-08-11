import { clearPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import { supabase } from "@/lib/supabase";
import { APP_ROUTES } from "@/utils/appRoutes";

type SignOutFlowArgs = {
  setPasswordRecoveryPending: (pending: boolean) => void;
  clearAuthState: () => void;
  router: { replace: (href: any) => void };
};

/**
 * The single sign-out contract for the app: whatever Supabase does, always drop
 * the pending auth intent, clear local auth state, and land on login. Screens
 * call this instead of re-implementing the sequence so the steps cannot drift.
 */
export async function runSignOutFlow({
  setPasswordRecoveryPending,
  clearAuthState,
  router,
}: SignOutFlowArgs) {
  try {
    await supabase.auth.signOut();
  } finally {
    await clearPendingAuthIntent();
    setPasswordRecoveryPending(false);
    clearAuthState();
    router.replace(APP_ROUTES.login);
  }
}
