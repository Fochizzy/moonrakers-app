export const PLAYER_STRIP_CARD_WIDTH = 120;
export const PLAYER_STRIP_GAP = 6;
export const PLAYER_STRIP_SIDE_INSET = 12;

type CenteredLeaderboardOffsetArgs = {
  activeIndex: number;
  entryCount: number;
  viewportWidth: number;
  cardWidth?: number;
  gap?: number;
  sideInset?: number;
};

export function getCenteredLeaderboardOffset({
  activeIndex,
  entryCount,
  viewportWidth,
  cardWidth = PLAYER_STRIP_CARD_WIDTH,
  gap = PLAYER_STRIP_GAP,
  sideInset = PLAYER_STRIP_SIDE_INSET,
}: CenteredLeaderboardOffsetArgs): number {
  if (activeIndex < 0 || entryCount <= 0 || viewportWidth <= 0) return 0;

  const contentWidth = entryCount * cardWidth + Math.max(0, entryCount - 1) * gap + sideInset * 2;
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const itemStart = sideInset + activeIndex * (cardWidth + gap);
  const rawOffset = itemStart - (viewportWidth - cardWidth) / 2;

  return Math.max(0, Math.min(rawOffset, maxOffset));
}
