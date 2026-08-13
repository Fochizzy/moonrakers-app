import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { HubTileGrid } from "@/components/ui/HubTileGrid";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { loadDashboardHome } from "@/lib/data/loadDashboardHome";
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
      <DashboardPanel padding="spacious" tone="accent">
        <SectionHeading
          copy={`Every analytics surface in one place for ${focusProfileName}. Each lane reads from the same server-authored contract the app uses.`}
          eyebrow="Data"
          title="Analytics hub"
        />
      </DashboardPanel>

      <div className="metric-grid">
        <MetricCard
          accent="var(--blue)"
          detail="Published commanders in this analytics profile."
          label="Tracked players"
          value={payload.hero.players}
        />
        <MetricCard
          accent="var(--gold)"
          detail="Finished tables feeding the current readout."
          label="Logged games"
          value={payload.hero.games}
        />
        <MetricCard
          accent="var(--accent)"
          detail="Report lanes surfaced by this dashboard."
          label="Analytics views"
          value={payload.hero.views}
        />
      </div>

      {payload.cards.length > 0 ? (
        <DashboardPanel padding="spacious">
          <div style={{ display: "grid", gap: "1rem" }}>
            <SectionHeading eyebrow="Headline" title="Current signals" />
            <div className="metric-grid">
              {payload.cards.map((card) => (
                <MetricCard key={card.key} label={card.label} value={card.value} />
              ))}
            </div>
          </div>
        </DashboardPanel>
      ) : null}

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy="Pick the lane that answers your question."
            eyebrow="Surfaces"
            title="Analytics lanes"
          />
          <HubTileGrid tiles={ANALYTICS_HUB_TILES} />
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy="The rest of the companion surfaces."
            eyebrow="Elsewhere"
            title="Other destinations"
          />
          <HubTileGrid
            tiles={BRIDGE_HUB_TILES.filter((tile) => tile.key !== "analytics")}
          />
        </div>
      </DashboardPanel>
    </section>
  );
}
