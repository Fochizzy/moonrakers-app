export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatElo(value: number): string {
  return Math.round(value).toString();
}

export function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits);
}
