/**
 * Authorship and affiliation copy, kept word for word identical to the site's
 * own footer in `apps/dashboard/src/lib/siteCredits.ts`. The two cannot share a
 * module — Metro and Next each inline their own `*_PUBLIC_` env vars — so
 * `scripts/site-credits-parity.test.cjs` guards the wording instead.
 *
 * `About` and `Portfolio` point at pages that do not exist yet, so each is a
 * link only once its URL is configured. A label with no destination still
 * renders; it just does not open anything.
 */
export const CREDIT_LINE_PREFIX = "Built by Izzy Hodnett with Claude";

export const AFFILIATION_DISCLAIMER =
  "Unofficial fan tool. Not affiliated with IV Studio.";

/** The whole line as one string, for the collapsed link on the Command page. */
export const CREDIT_LINE = `${CREDIT_LINE_PREFIX} · About · Portfolio`;

export type CreditLink = {
  /** `null` until the destination exists; the label still renders. */
  url: string | null;
  label: string;
};

/** Trims and rejects blanks so an empty env var reads as "not configured". */
function readUrl(value: string | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getCreditLinks(): CreditLink[] {
  // Expo inlines `EXPO_PUBLIC_*` only where it is written out literally, so
  // these two reads cannot be collapsed into a lookup by name.
  return [
    { label: "About", url: readUrl(process.env.EXPO_PUBLIC_ABOUT_URL) },
    { label: "Portfolio", url: readUrl(process.env.EXPO_PUBLIC_PORTFOLIO_URL) },
  ];
}
