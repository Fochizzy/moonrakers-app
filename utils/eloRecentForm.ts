function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isDescribedRecentForm(value: string): boolean {
  return /^\d+\s+wins?\s+in\s+last\s+\d+$/i.test(value);
}

function normalizeRecentFormSequence(value: string): string {
  const compact = value.toUpperCase().replace(/[\s,\-|]/g, "");
  return compact && !/[^WL]/.test(compact) ? compact : "";
}

export function describeRecentForm(value: unknown): string {
  const trimmed = asTrimmedString(value);
  if (!trimmed) {
    return "-";
  }

  if (isDescribedRecentForm(trimmed)) {
    return trimmed;
  }

  const sequence = normalizeRecentFormSequence(trimmed);
  if (!sequence) {
    return trimmed;
  }

  const wins = Array.from(sequence).filter((entry) => entry === "W").length;
  return `${wins} win${wins === 1 ? "" : "s"} in last ${sequence.length}`;
}

export function replaceRecentFormSummaryInText(
  body: unknown,
  recentForm: unknown,
): string {
  const text = asTrimmedString(body);
  if (!text) {
    return "";
  }

  const trimmedRecentForm = asTrimmedString(recentForm);
  const describedRecentForm = describeRecentForm(trimmedRecentForm);
  if (!trimmedRecentForm || describedRecentForm === trimmedRecentForm) {
    return text;
  }

  const replacedFromLabel = text.replace(
    /(recent form:\s*)([WL\s,\-|]+)(\.)/i,
    `$1${describedRecentForm}$3`,
  );
  if (replacedFromLabel !== text) {
    return replacedFromLabel;
  }

  return text.includes(trimmedRecentForm)
    ? text.replace(trimmedRecentForm, describedRecentForm)
    : text;
}
