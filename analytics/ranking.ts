export function rankPlayers(players: any[]) {
  return [...players].sort((a, b) => {
    return (
      (b.elo || 0) - (a.elo || 0) ||
      (b.prestige || 0) - (a.prestige || 0)
    );
  });
}
