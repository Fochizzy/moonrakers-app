// -----------------------------
// ♻️ Constants
// -----------------------------
const INVALID = 'Invalid Date';

// -----------------------------
// 🧠 Shared date parser
// -----------------------------
function parseDate(input: string | number | Date | undefined): Date | null {
  if (input == null) return null;

  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// -----------------------------
// ⚡ Cached formatters (BIG win)
// -----------------------------
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

// -----------------------------
// 📅 Format full date + time
// -----------------------------
export function formatDate(
  date: string | number | Date | undefined
): string {
  const d = parseDate(date);
  return d ? DATE_TIME_FORMATTER.format(d) : INVALID;
}

// -----------------------------
// 📅 Format short date
// -----------------------------
export function formatShortDate(
  date: string | number | Date | undefined
): string {
  const d = parseDate(date);
  return d ? DATE_FORMATTER.format(d) : INVALID;
}

// -----------------------------
// 🔢 Format round
// -----------------------------
export function formatRound(round: number | undefined): string {
  return round && round > 0 ? `Round ${round}` : 'Round ?';
}
