import { CompareView } from "@/components/compare/CompareView";
import { loadCompareScreen } from "@/lib/data/loadCompareScreen";

function readSearchParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { dataset, setup } = await loadCompareScreen({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
    comparePlayerId: readSearchParam(resolvedSearchParams.comparePlayerId),
  });

  return <CompareView dataset={dataset} setup={setup} />;
}
