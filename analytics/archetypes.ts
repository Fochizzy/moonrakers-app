////////////////////////////////////////////////////////////////////////////////
// 🎮 BUILD REPLAY
////////////////////////////////////////////////////////////////////////////////
export function buildReplay(game: any) {
  if (!game) return [];

  const players = game.players;

  const running: Record<string, any> = {};

  players.forEach((p: any) => {
    running[p.id] = {
      score: 0,
      prestige: 0,
      assists: 0,
    };
  });

  const replay: any[] = [];

  game.rounds.forEach((round: any, i: number) => {
    Object.entries(round.stats || {}).forEach(
      ([id, stats]: any) => {
        running[id].score += stats.score || 0;
        running[id].prestige += stats.prestige || 0;
        running[id].assists += stats.assists || 0;
      }
    );

    replay.push({
      round: i,
      snapshot: JSON.parse(JSON.stringify(running)),
    });
  });

  return replay;
}
