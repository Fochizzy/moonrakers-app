import { HomeView } from "@/components/home/HomeView";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { HubTileGrid } from "@/components/ui/HubTileGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { loadDashboardHome } from "@/lib/data/loadDashboardHome";
import { BRIDGE_HUB_TILES } from "@/lib/hubs";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { focusProfileName, payload } = await loadDashboardHome({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
  });

  return (
    <div className="view-stack">
      <HomeView focusName={focusProfileName} payload={payload} />

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy="The same hub destinations the app puts on its command screen."
            eyebrow="Go to"
            title="Companion surfaces"
          />
          <HubTileGrid tiles={BRIDGE_HUB_TILES} />
        </div>
      </DashboardPanel>
    </div>
  );
}
