const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function toDate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Mirrors the app's `formatDate`. Server and browser render in their own
 * timezone, so any element showing these strings needs
 * `suppressHydrationWarning` and the browser's value wins after hydration.
 */
export function formatDateTime(value: number | string | null | undefined) {
  const date = toDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : "Unknown date";
}

export function formatShortDate(value: number | string | null | undefined) {
  const date = toDate(value);
  return date ? DATE_FORMATTER.format(date) : "Unknown date";
}
