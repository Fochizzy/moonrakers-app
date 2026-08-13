import { GameSummaryView } from "@/components/games/GameSummaryView";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { loadGameDetail } from "@/lib/data/loadGameDetail";
import { buildGameSummary } from "@/lib/games/gameSummary";

export default async function GameSummaryPage({
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
          copy="That saved game is not available to this account. Open a game from History to read its summary."
          eyebrow="Game Summary"
          title="Game not found"
        />
      </section>
    );
  }

  return (
    <GameSummaryView
      gameId={detail.game.id}
      summary={buildGameSummary(detail.game)}
    />
  );
}
