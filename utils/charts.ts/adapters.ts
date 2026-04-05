const EMPTY_ARRAY: number[] = [];

/**
 * Converts interleaved [x,y,x,y,...] Float32 data into a downsampled y-array.
 * This helper is prestige-model agnostic and does not require scoring changes.
 */
export function toYArrayDownsampled(
  data: Float32Array,
  maxPoints: number
): number[] {
  const len = data.length >> 1;

  if (len === 0 || maxPoints <= 0) {
    return EMPTY_ARRAY;
  }

  if (maxPoints === 1) {
    return [data[1] ?? 0];
  }

  if (len <= maxPoints) {
    const out = new Array<number>(len);

    for (let i = 0, j = 1; i < len; i++, j += 2) {
      out[i] = data[j] ?? 0;
    }

    return out;
  }

  const out = new Array<number>(maxPoints);
  const lastIndex = len - 1;
  const scale = lastIndex / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i++) {
    const pointIndex = Math.min(lastIndex, Math.floor(i * scale));
    const dataIndex = pointIndex * 2 + 1;
    out[i] = data[dataIndex] ?? 0;
  }

  return out;
}
