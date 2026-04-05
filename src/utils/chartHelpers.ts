export function normalize(values: number[]) {
  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}
