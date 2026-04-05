export function getTier(rating: number) {
  if (rating >= 1600) return 'diamond';
  if (rating >= 1400) return 'platinum';
  if (rating >= 1200) return 'gold';
  if (rating >= 1100) return 'silver';
  return 'bronze';
}
