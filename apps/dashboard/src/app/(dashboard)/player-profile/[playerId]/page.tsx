import { ProfileView } from "@/components/profile/ProfileView";
import { loadProfileScreen } from "@/lib/data/loadProfileScreen";
import {
  normalizeOptionalSearchParam,
  readSearchParam,
} from "@/lib/readSearchParam";

export default async function PlayerProfileDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { playerId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const payload = await loadProfileScreen({
    focusPlayerId: decodeURIComponent(playerId),
    opponentId: normalizeOptionalSearchParam(
      readSearchParam(resolvedSearchParams.opponentId),
    ),
  });

  return <ProfileView payload={payload} />;
}
