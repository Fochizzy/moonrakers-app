////////////////////////////////////////////////////////////////////////////////
// ⚔️ HEAD TO HEAD
////////////////////////////////////////////////////////////////////////////////
export function getHeadToHeadStats(
  games: any[],
  playerId: string,
  opponentId: string
) {
  let total = 0;
  let wins = 0;

  games.forEach((g) => {
    const ids = g.players.map((p: any) => p.id);

    if (
      ids.includes(playerId) &&
      ids.includes(opponentId)
    ) {
      total++;

      if (g.winnerId === playerId) {
        wins++;
      }
    }
  });

  return {
    games: total,
    wins,
    losses: total - wins,
    winRate: wins / (total || 1),
  };
}

////////////////////////////////////////////////////////////////////////////////
// 🧠 ALL MATCHUPS
////////////////////////////////////////////////////////////////////////////////
export function getAllHeadToHead(
  games: any[],
  playerId: string,
  players: any[]
) {
  return players
    .filter((p) => p.id !== playerId)
    .map((p) => ({
      opponent: p,
      ...getHeadToHeadStats(
        games,
        playerId,
        p.id
      ),
    }));
}
