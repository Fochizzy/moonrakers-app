import { PlayerDirectoryView } from "@/components/players/PlayerDirectoryView";
import { loadPlayerRoster } from "@/lib/data/loadPlayerRoster";

export default async function PlayerDirectoryPage() {
  const roster = await loadPlayerRoster();

  return (
    <PlayerDirectoryView
      groups={roster.groups}
      players={roster.players}
      signedInPlayerId={roster.signedInPlayerId}
    />
  );
}
