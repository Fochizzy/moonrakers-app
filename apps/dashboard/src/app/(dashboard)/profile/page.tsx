import { ProfileView } from "@/components/profile/ProfileView";
import { loadProfileScreen } from "@/lib/data/loadProfileScreen";

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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
