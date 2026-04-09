export function safeNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function safeDivide(a: number, b: number, fallback = 0): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return fallback;
  return a / b;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return mean(values.map(v => (v - m) ** 2));
}

export function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

export function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(-n);
}

export function slope(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const xMean = mean(xs);
  const yMean = mean(ys);

  let num = 0;
  let den = 0;

  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }

  return den === 0 ? 0 : num / den;
}
