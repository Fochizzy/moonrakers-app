import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { loadRegisteredProfiles } from "@/lib/cloud/loadRegisteredProfiles";
import { loadStatsSnapshot } from "@/lib/cloud/loadStatsSnapshot";
import type { AuthSession } from "@/store/useStore";
import { mergeRegisteredProfilesIntoPlayers } from "@/utils/registeredProfilePlayer";

export async function loadHydratedCloudState(session: AuthSession) {
  const profileId = String(session?.user?.id ?? "").trim();
  if (!profileId) {
    throw new Error("Signed-in session required to hydrate the shared cloud snapshot.");
  }

  const [snapshot, registeredProfiles] = await Promise.all([
    loadCloudSnapshot(profileId),
    loadRegisteredProfiles().catch(
      (): Awaited<ReturnType<typeof loadRegisteredProfiles>> => [],
    ),
  ]);

  const statsSnapshot = await loadStatsSnapshot({
    profileId,
    groups: snapshot.groups,
    games: snapshot.games,
  });

  return {
    session,
    snapshot: {
      ...snapshot,
      players: mergeRegisteredProfilesIntoPlayers(snapshot.players, registeredProfiles),
    },
    statsSnapshot,
  };
}
