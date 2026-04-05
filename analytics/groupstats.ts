////////////////////////////////////////////////////////////////////////////////
// 👥 GROUP STATS
////////////////////////////////////////////////////////////////////////////////
export function getGroupStats(
  games: any[],
  playerId: string
) {
  const groups: Record<string, any> = {};

  games.forEach((g) => {
    const ids = g.players.map((p: any) => p.id);

    if (!ids.includes(playerId)) return;

    const key = ids.sort().join('-');

    if (!groups[key]) {
      groups[key] = {
        games: 0,
        wins: 0,
      };
    }

    groups[key].games++;

    if (g.winnerId === playerId) {
      groups[key].wins++;
    }
  });

  return Object.entries(groups).map(([k, v]: any) => ({
    group: k,
    games: v.games,
    winRate: v.wins / v.games,
  }));
}
