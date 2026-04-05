
export function getDeltaColor(value: number) {
  if (value > 0.25) return '#22c55e';
  if (value > 0.05) return '#4ade80';
  if (value < -0.25) return '#ef4444';
  if (value < -0.05) return '#f87171';
  return '#94a3b8';
}
