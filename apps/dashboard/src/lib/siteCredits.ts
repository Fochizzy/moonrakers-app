/**
 * The authorship line every page of the site ends on.
 *
 * `About` and `Portfolio` point at pages that do not exist yet, so each one is
 * a link only once its URL is configured. Shipping the words as plain text is
 * better than shipping a link to a 404 — and the moment the environment
 * variable is set the same word becomes a link with no code change.
 *
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time only where it is
 * written out literally, so the two reads below cannot be collapsed into a
 * lookup by name.
 */
export const CREDIT_LINE_PREFIX = "Built by Izzy Hodnett with Claude";

export const AFFILIATION_DISCLAIMER =
  "Unofficial fan tool. Not affiliated with IV Studio.";

export type CreditLink = {
  /** `null` until the destination exists; the label still renders. */
  href: string | null;
  label: string;
};

/** Trims and rejects blanks so an empty env var reads as "not configured". */
function readUrl(value: string | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getCreditLinks(): CreditLink[] {
  return [
    { label: "About", href: readUrl(process.env.NEXT_PUBLIC_ABOUT_URL) },
    { label: "Portfolio", href: readUrl(process.env.NEXT_PUBLIC_PORTFOLIO_URL) },
  ];
}
