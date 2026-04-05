export function buildStatHistory(
  games: any[],
  playerId: string
) {
  const history: any[] = [];

  let running = {
    score: 0,
    prestige: 0,
  };

  games
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((g) => {
      const totals = g.totals[playerId];

      if (!totals) return;

      running.score += totals.score || 0;
      running.prestige += totals.prestige || 0;

      history.push({
        gameId: g.id,
        score: running.score,
        prestige: running.prestige,
      });
    });

  return history;
}
