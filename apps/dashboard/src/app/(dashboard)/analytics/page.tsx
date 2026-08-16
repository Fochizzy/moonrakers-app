import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { HubTileGrid } from "@/components/ui/HubTileGrid";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { loadDashboardHome } from "@/lib/data/loadDashboardHome";
import { formatCount } from "@/lib/formatNumber";
import { ANALYTICS_HUB_TILES, BRIDGE_HUB_TILES } from "@/lib/hubs";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function AnalyticsHubPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { focusProfileName, payload } = await loadDashboardHome({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
  });

  return (
    <section className="view-stack">
      <PageHeader
        copy={`Every analytics surface in one place for ${focusProfileName}. Each lane reads from the same server-authored contract the app uses.`}
        eyebrow="Data"
        meta={`${formatCount(payload.hero.games)} finished games · ${formatCount(payload.hero.players)} players`}
        title="Analytics hub"
      />

      <DashboardPanel padding="normal">
        <SectionHeading
          copy="Pick the lane that answers your question."
          eyebrow="Surfaces"
          title="Analytics lanes"
        />
        <HubTileGrid tiles={ANALYTICS_HUB_TILES} />
      </DashboardPanel>

      {payload.cards.length > 0 ? (
        <DashboardPanel padding="normal">
          <SectionHeading
            copy="Published straight from the analytics contract for the focused player."
            eyebrow="Headline"
            title="Current signals"
          />
          <div className="stat-grid">
            {payload.cards.map((card) => (
              <MetricCard
                accent={card.accent}
                detail={card.detail}
                key={card.key}
                label={card.label}
                value={card.value}
              />
            ))}
          </div>
        </DashboardPanel>
      ) : null}

      <DashboardPanel padding="normal">
        <SectionHeading
          copy="The rest of the companion surfaces."
          eyebrow="Elsewhere"
          title="Other destinations"
        />
        <HubTileGrid
          tiles={BRIDGE_HUB_TILES.filter((tile) => tile.key !== "analytics")}
        />
      </DashboardPanel>
    </section>
  );
}
