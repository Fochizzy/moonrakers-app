import { HistoryView } from "@/components/history/HistoryView";
import { loadHistoryScreen } from "@/lib/data/loadHistoryScreen";
import {
  normalizeOptionalSearchParam,
  readSearchParam,
} from "@/lib/readSearchParam";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { rows } = await loadHistoryScreen();

  return (
    <HistoryView
      focusGameId={normalizeOptionalSearchParam(
        readSearchParam(resolvedSearchParams.gameId),
      )}
      rows={rows}
    />
  );
}
