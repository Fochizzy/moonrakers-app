export function movingAverage(data: number[], window = 3) {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - window), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
