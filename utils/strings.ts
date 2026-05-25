export function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}
