import { Platform } from "react-native";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";

// Crash telemetry with no external vendor: reports land in the
// client_error_reports table (insert-only through RLS; triage in the Supabase
// dashboard). Everything here is best-effort — a failing reporter must never
// take the app down with it, so every path swallows its own errors.

const MAX_REPORTS_PER_SESSION = 10;
const MAX_TEXT_LENGTH = 4000;

let installed = false;
let reportsThisSession = 0;

function clip(value: unknown): string {
  return String(value ?? "").slice(0, MAX_TEXT_LENGTH);
}

/** Also used by the in-app bug report, so a report carries the build it came from. */
export function getAppVersion(): string | null {
  const version = Constants.expoConfig?.version;
  return typeof version === "string" && version.trim() ? version.trim() : null;
}

export async function reportError(
  error: unknown,
  options?: { isFatal?: boolean; context?: Record<string, unknown> },
) {
  if (reportsThisSession >= MAX_REPORTS_PER_SESSION) {
    return;
  }
  reportsThisSession += 1;

  try {
    const { data } = await supabase.auth.getSession();
    const profileId = String(data?.session?.user?.id ?? "").trim() || null;

    const err = error instanceof Error ? error : null;

    await supabase.from("client_error_reports").insert({
      profile_id: profileId,
      platform: Platform.OS,
      app_version: getAppVersion(),
      is_fatal: Boolean(options?.isFatal),
      message: clip(err?.message ?? error) || "Unknown error",
      stack: err?.stack ? clip(err.stack) : null,
      context: options?.context ?? {},
    });
  } catch {
    // Reporting is best-effort; never let telemetry throw.
  }
}

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsLike = {
  getGlobalHandler?: () => GlobalErrorHandler | undefined;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

/**
 * Hooks React Native's global error handler. Reports the error, then hands it
 * to the previous handler so dev-mode red screens and default fatal behavior
 * are unchanged.
 */
export function installErrorReporting() {
  if (installed) {
    return;
  }
  installed = true;

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) {
    return;
  }

  const previousHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    void reportError(error, { isFatal: Boolean(isFatal), context: { source: "global" } });
    previousHandler?.(error, isFatal);
  });
}
