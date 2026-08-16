import { ChartsIndexView } from "@/components/charts/ChartsIndexView";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function ChartsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <ChartsIndexView
      focusPlayerId={readSearchParam(resolvedSearchParams.focusPlayerId)}
    />
  );
}
