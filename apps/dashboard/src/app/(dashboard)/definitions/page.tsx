import { DefinitionsView } from "@/components/definitions/DefinitionsView";
import { requireDashboardAccess } from "@/lib/auth/serverAccess";
import { buildDefinitionSections } from "@/lib/definitions/definitionsScreen";
import {
  normalizeOptionalSearchParam,
  readSearchParam,
} from "@/lib/readSearchParam";

export default async function DefinitionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireDashboardAccess();
  const resolvedSearchParams = (await searchParams) ?? {};
  const category = normalizeOptionalSearchParam(
    readSearchParam(resolvedSearchParams.category),
  );
  const metric = normalizeOptionalSearchParam(
    readSearchParam(resolvedSearchParams.metric),
  );

  return (
    <DefinitionsView
      category={category}
      // Remount on a new deep link so the search box and category tab reset to
      // whatever the incoming metric points at.
      key={`${metric ?? ""}:${category ?? ""}`}
      metric={metric}
      sections={buildDefinitionSections()}
      sourceLabel={normalizeOptionalSearchParam(
        readSearchParam(resolvedSearchParams.sourceLabel),
      )}
    />
  );
}
