import { Game, StoredRound } from '@/store/useStore';
import { SourcePlayerLike } from '@/components/charts/core/metricSchema';

function safeNumber(v: any): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function resolveGameToPlayers(game: Game): SourcePlayerLike[] {
  if (!game || !game.players) return [];

  return game.players.map((player) => {
    const totals = game.totals?.[player.id] ?? {};

    return {
      id: player.id,
      name: player.name,
      color: player.color,

      score: safeNumber(totals.score),

      totalPrestige:
        safeNumber(totals.totalPrestige) ||
        safeNumber(totals.prestige),

      directPrestige: safeNumber(totals.directPrestige),
      assistPrestigeReceived: safeNumber(totals.assistPrestigeReceived),

      assists: safeNumber(totals.assists),
      contracts: safeNumber(totals.contracts),
      failures: safeNumber(totals.failures),

      turns:
        safeNumber(game.roundCount) ||
        safeNumber(game.rounds?.length),
    };
  });
}

export function resolveAllGamesToPlayers(games: Game[]): SourcePlayerLike[] {
  if (!Array.isArray(games)) return [];

  const aggregate = new Map<string, SourcePlayerLike>();

  for (const game of games) {
    const players = resolveGameToPlayers(game);

    for (const p of players) {
      if (!aggregate.has(p.id!)) {
        aggregate.set(p.id!, { ...p });
      } else {
        const existing = aggregate.get(p.id!)!;

        existing.score += safeNumber(p.score);
        existing.totalPrestige += safeNumber(p.totalPrestige);
        existing.directPrestige += safeNumber(p.directPrestige);
        existing.assistPrestigeReceived += safeNumber(p.assistPrestigeReceived);
        existing.assists += safeNumber(p.assists);
        existing.contracts += safeNumber(p.contracts);
        existing.failures += safeNumber(p.failures);
        existing.turns += safeNumber(p.turns);
      }
    }
  }

  return Array.from(aggregate.values());
}