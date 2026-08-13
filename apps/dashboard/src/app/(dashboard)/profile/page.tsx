import { ProfileView } from "@/components/profile/ProfileView";
import { loadProfileScreen } from "@/lib/data/loadProfileScreen";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const payload = await loadProfileScreen({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
    opponentId: readSearchParam(resolvedSearchParams.opponentId),
  });

  return <ProfileView payload={payload} />;
}
