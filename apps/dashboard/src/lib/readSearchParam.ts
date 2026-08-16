export function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeOptionalSearchParam(
  value: string | null | undefined,
  options?: {
    emptyValues?: string[];
  },
) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const emptyValues = new Set(
    (options?.emptyValues ?? []).map((entry) => entry.trim().toLowerCase()),
  );
  return emptyValues.has(trimmed.toLowerCase()) ? null : trimmed;
}
