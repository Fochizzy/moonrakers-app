import { CompareView } from "@/components/compare/CompareView";
import { loadCompareScreen } from "@/lib/data/loadCompareScreen";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { controls, dataset, setup } = await loadCompareScreen({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
    comparePlayerId: readSearchParam(resolvedSearchParams.comparePlayerId),
  });

  return <CompareView controls={controls} dataset={dataset} setup={setup} />;
}
