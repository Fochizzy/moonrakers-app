export function buildChartData(playerId: string, { games }: any) {
  let elo = 1000;
  const data = [];

  games.forEach((g: any, i: number) => {
    if (g.totals?.[playerId]) {
      elo += g.totals[playerId].score ?? 0;
      data.push({ x: i, y: elo });
    }
  });

  return data;
}
