import { getSupabaseClient } from '@/lib/supabase';

/**
 * Files an in-app bug report.
 *
 * The row is all this has to get right: a trigger on `bug_reports` hands the
 * email to pg_net once the insert commits, so delivery does not depend on the
 * phone still having signal by the time the modal closes.
 */

export const MAX_BUG_REPORT_LENGTH = 4000;

export type BugReportDraft = {
  appVersion?: string | null;
  description: string;
  platform?: string | null;
  profileId: string | null;
  reporterName: string;
};

export type BugReportOutcome =
  | { ok: true }
  | { message: string; ok: false };

/** Exported so the modal can disable submit without duplicating the rule. */
export function isSubmittableBugReport(description: string) {
  const trimmed = description.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_BUG_REPORT_LENGTH;
}

export async function submitBugReport(
  draft: BugReportDraft,
): Promise<BugReportOutcome> {
  const description = draft.description.trim();

  if (!isSubmittableBugReport(description)) {
    return {
      ok: false,
      message:
        description.length === 0
          ? 'Describe what went wrong before sending.'
          : `Keep it under ${MAX_BUG_REPORT_LENGTH} characters.`,
    };
  }

  // RLS requires profile_id = auth.uid(), so an unauthenticated insert would be
  // rejected by the database anyway. Saying so here is clearer than surfacing a
  // policy violation.
  if (!draft.profileId) {
    return {
      ok: false,
      message: 'Sign in before sending a bug report.',
    };
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('bug_reports').insert({
      app_version: draft.appVersion ?? null,
      description,
      platform: draft.platform ?? null,
      profile_id: draft.profileId,
      reporter_name: draft.reporterName.trim() || 'Unknown player',
    });

    if (error) {
      return { ok: false, message: 'Could not send that report. Try again.' };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      message: 'Could not reach the server. Check your connection.',
    };
  }
}
