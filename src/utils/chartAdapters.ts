export function toYArray(data: any[]) {
  return data.map((d) => d.y);
}

export function downsampleY(data: number[], max: number) {
  if (data.length <= max) return data;

  const step = data.length / max;
  return Array.from({ length: max }, (_, i) => data[Math.floor(i * step)]);
}
