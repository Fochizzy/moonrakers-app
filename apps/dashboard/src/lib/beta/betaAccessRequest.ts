/**
 * Validation for the signed-out beta access form.
 *
 * Kept free of Next, Supabase, and Brevo so the rules can be tested directly:
 * this is the only thing standing between a public form and both the table and
 * two outbound emails.
 */

/** RFC-shaped enough to reject typos without rejecting real addresses. */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Matches the `email` column's length cap in the migration. */
export const MAX_EMAIL_LENGTH = 254;

export type BetaAccessRequestResult =
  | { email: string; ok: true }
  | { message: string; ok: false };

/**
 * Google ignores case in the domain and, for Gmail, in the local part too. The
 * table's unique index is on `lower(email)`, so normalise the same way here or
 * the same person can be told "you're on the list" and "welcome" on alternate
 * submissions.
 */
export function normalizeBetaEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function parseBetaAccessRequest(value: unknown): BetaAccessRequestResult {
  const email = normalizeBetaEmail(value);

  if (email.length === 0) {
    return {
      ok: false,
      message: "Enter the email address on your Google Play account.",
    };
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    return { ok: false, message: "That email address is too long." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "That does not look like an email address." };
  }

  return { ok: true, email };
}

/**
 * Postgres raises 23505 when the unique index rejects a repeat address. That is
 * not a failure the person needs to act on — they are already on the list.
 */
export function isDuplicateRequestError(error: { code?: string } | null) {
  return error?.code === "23505";
}
