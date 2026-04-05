////////////////////////////////////////////////////////////////////////////////
// 📊 TYPES
////////////////////////////////////////////////////////////////////////////////
type Player = {
  id: string;
  name: string;
  elo?: number;
};

type Game = {
  players: Player[];
  winnerId: string;
};

type DifficultyResult = {
  score: number; // 0–100
  label: 'Easy' | 'Balanced' | 'Hard' | 'Brutal';
  breakdown: {
    avgOpponentElo: number;
    maxOpponentElo: number;
    playerCountFactor: number;
    headToHeadPressure: number;
    volatility: number;
  };
};

////////////////////////////////////////////////////////////////////////////////
// 🧠 HELPERS
////////////////////////////////////////////////////////////////////////////////
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

////////////////////////////////////////////////////////////////////////////////
// ⚔️ HEAD-TO-HEAD PRESSURE
////////////////////////////////////////////////////////////////////////////////
function getHeadToHeadPressure(
  games: Game[],
  playerId: string,
  opponents: Player[]
) {
  let pressure = 0;

  opponents.forEach((op) => {
    let wins = 0;
    let total = 0;

    games.forEach((g) => {
      const ids = g.players.map((p) => p.id);

      if (ids.includes(playerId) && ids.includes(op.id)) {
        total++;

        if (g.winnerId === op.id) {
          wins++;
        }
      }
    });

    if (total > 0) {
      const lossRate = wins / total; // how often THEY beat YOU
      pressure += lossRate;
    }
  });

  return pressure / Math.max(opponents.length, 1);
}

////////////////////////////////////////////////////////////////////////////////
// 🎲 VOLATILITY (UNPREDICTABILITY)
////////////////////////////////////////////////////////////////////////////////
function getVolatility(games: Game[], playerIds: string[]) {
  const winners: Record<string, number> = {};

  games.forEach((g) => {
    if (!playerIds.every((id) => g.players.some((p) => p.id === id))) {
      return;
    }

    winners[g.winnerId] = (winners[g.winnerId] || 0) + 1;
  });

  const counts = Object.values(winners);

  if (counts.length <= 1) return 0;

  const avg = average(counts);

  const variance =
    average(counts.map((c) => Math.pow(c - avg, 2))) || 0;

  return clamp(variance / 10, 0, 1);
}

////////////////////////////////////////////////////////////////////////////////
// 🚀 MAIN FUNCTION
////////////////////////////////////////////////////////////////////////////////
export function calculateDifficulty({
  currentPlayerId,
  players,
  allGames,
}: {
  currentPlayerId: string;
  players: Player[];
  allGames: Game[];
}): DifficultyResult {
  ////////////////////////////////////////////////////////////////////////////
  // 🎯 SETUP
  ////////////////////////////////////////////////////////////////////////////
  const me = players.find((p) => p.id === currentPlayerId);

  if (!me) {
    return {
      score: 0,
      label: 'Balanced',
      breakdown: {
        avgOpponentElo: 0,
        maxOpponentElo: 0,
        playerCountFactor: 0,
        headToHeadPressure: 0,
        volatility: 0,
      },
    };
  }

  const opponents = players.filter(
    (p) => p.id !== currentPlayerId
  );

  ////////////////////////////////////////////////////////////////////////////
  // 📊 ELO METRICS
  ////////////////////////////////////////////////////////////////////////////
  const opponentElos = opponents.map((p) => p.elo || 1000);

  const avgOpponentElo = average(opponentElos);
  const maxOpponentElo = Math.max(...opponentElos, 1000);

  const eloDiff = avgOpponentElo - (me.elo || 1000);

  // normalize to 0–1
  const eloFactor = clamp((eloDiff + 400) / 800, 0, 1);

  ////////////////////////////////////////////////////////////////////////////
  // 👥 PLAYER COUNT FACTOR
  ////////////////////////////////////////////////////////////////////////////
  const count = players.length;

  // more players = harder
  const playerCountFactor = clamp((count - 2) / 4, 0, 1);

  ////////////////////////////////////////////////////////////////////////////
  // ⚔️ HEAD-TO-HEAD PRESSURE
  ////////////////////////////////////////////////////////////////////////////
  const headToHeadPressure = getHeadToHeadPressure(
    allGames,
    currentPlayerId,
    opponents
  );

  ////////////////////////////////////////////////////////////////////////////
  // 🎲 VOLATILITY
  ////////////////////////////////////////////////////////////////////////////
  const volatility = getVolatility(
    allGames,
    players.map((p) => p.id)
  );

  ////////////////////////////////////////////////////////////////////////////
  // 🧮 FINAL SCORE
  ////////////////////////////////////////////////////////////////////////////
  const score =
    eloFactor * 40 +
    playerCountFactor * 20 +
    headToHeadPressure * 25 +
    volatility * 15;

  const finalScore = Math.round(clamp(score, 0, 100));

  ////////////////////////////////////////////////////////////////////////////
  // 🏷 LABEL
  ////////////////////////////////////////////////////////////////////////////
  let label: DifficultyResult['label'] = 'Balanced';

  if (finalScore < 30) label = 'Easy';
  else if (finalScore < 55) label = 'Balanced';
  else if (finalScore < 75) label = 'Hard';
  else label = 'Brutal';

  ////////////////////////////////////////////////////////////////////////////
  // 🎯 RETURN
  ////////////////////////////////////////////////////////////////////////////
  return {
    score: finalScore,
    label,
    breakdown: {
      avgOpponentElo,
      maxOpponentElo,
      playerCountFactor,
      headToHeadPressure,
      volatility,
    },
  };
}
