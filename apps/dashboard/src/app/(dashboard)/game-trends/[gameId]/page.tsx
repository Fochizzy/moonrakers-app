import { GameTrendsView } from "@/components/games/GameTrendsView";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { loadGameDetail } from "@/lib/data/loadGameDetail";
import { buildGameStandings } from "@/lib/games/gameSummary";
import { buildGameTrends } from "@/lib/games/gameTrends";

export default async function GameTrendsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const detail = await loadGameDetail(decodeURIComponent(gameId));

  if (!detail) {
    return (
      <section className="view-stack">
        <EmptyStatePanel
          copy="That saved game is not available to this account. Open a game from History to read its trends."
          eyebrow="Postgame"
          title="Game not found"
        />
      </section>
    );
  }

  const standings = buildGameStandings(detail.game);

  return (
    <GameTrendsView
      createdAt={detail.game.createdAt}
      gameId={detail.game.id}
      roundCount={detail.game.roundCount}
      trends={buildGameTrends(detail.game)}
      winnerName={standings.find((row) => row.isWinner)?.name ?? null}
    />
  );
}
