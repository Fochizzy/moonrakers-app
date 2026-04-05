export function buildSummary(players: any[], rounds: any[]) {
  const totals: any = {};
  const bestRound: any = {};

  players.forEach((p) => {
    totals[p.id] = {
      score: 0,
      prestige: 0,
      efficiency: 0,
      assistedEfficiency: 0,
    };
    bestRound[p.id] = 0;
  });

  rounds.forEach((r) => {
    Object.entries(r.stats || {}).forEach(([id, stat]: any) => {
      totals[id].score += stat.score ?? 0;
      totals[id].prestige += stat.prestige ?? 0;
      totals[id].efficiency += stat.efficiency ?? 0;
      totals[id].assistedEfficiency += stat.assistedEfficiency ?? 0;

      bestRound[id] = Math.max(bestRound[id], stat.score ?? 0);
    });
  });

  const winnerId = Object.entries(totals).sort(
    (a: any, b: any) => b[1].score - a[1].score
  )[0]?.[0];

  return { totals, bestRound, winnerId };
}
