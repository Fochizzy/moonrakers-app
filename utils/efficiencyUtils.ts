
export function getEfficiencyTier(value: number) {
  if (value >= 3.0) return { label: 'S', color: '#22c55e' };
  if (value >= 2.2) return { label: 'A', color: '#84cc16' };
  if (value >= 1.5) return { label: 'B', color: '#eab308' };
  if (value >= 1.0) return { label: 'C', color: '#f97316' };
  return { label: 'D', color: '#ef4444' };
}
