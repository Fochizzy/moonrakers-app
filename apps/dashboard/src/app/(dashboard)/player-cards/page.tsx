import { PlayerCardsView } from "@/components/players/PlayerCardsView";
import { loadPlayerRoster } from "@/lib/data/loadPlayerRoster";
import {
  normalizeOptionalSearchParam,
  readSearchParam,
} from "@/lib/readSearchParam";

export default async function PlayerCardsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const roster = await loadPlayerRoster();

  return (
    <PlayerCardsView
      focusPlayerId={normalizeOptionalSearchParam(
        readSearchParam(resolvedSearchParams.playerId),
      )}
      players={roster.players}
      signedInPlayerId={roster.signedInPlayerId}
    />
  );
}
