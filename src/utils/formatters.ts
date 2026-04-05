export const formatPercent = (v: number) =>
  `${(v * 100).toFixed(1)}%`;

export const formatNumber = (v: number) =>
  v.toLocaleString();
