const FALLBACK_COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

export function getStablePlayerColor(playerId: string, preferredColor?: string): string {
  if (preferredColor) {
    return preferredColor;
  }

  let hash = 0;
  for (let index = 0; index < playerId.length; index += 1) {
    hash = (hash << 5) - hash + playerId.charCodeAt(index);
    hash |= 0;
  }

  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export function withAlpha(hexColor: string, alphaHex: string): string {
  if (!hexColor.startsWith('#')) {
    return hexColor;
  }

  const normalized = hexColor.length === 4
    ? `#${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}${hexColor[3]}${hexColor[3]}`
    : hexColor;

  return `${normalized}${alphaHex}`;
}
