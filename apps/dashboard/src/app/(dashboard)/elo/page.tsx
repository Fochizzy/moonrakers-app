import { EloView } from "@/components/elo/EloView";
import { loadEloScreen } from "@/lib/data/loadEloScreen";

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EloPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const payload = await loadEloScreen({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
    opponentId: readSearchParam(resolvedSearchParams.opponentId),
    sortKey: readSearchParam(resolvedSearchParams.sortKey),
  });

  return <EloView payload={payload} />;
}
