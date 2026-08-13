import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { HubTileGrid } from "@/components/ui/HubTileGrid";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { loadPlayerRoster } from "@/lib/data/loadPlayerRoster";
import { PLAYERS_HUB_TILES } from "@/lib/hubs";

export default async function PlayersHubPage() {
  const roster = await loadPlayerRoster();
  const ratedPlayers = roster.players.filter((player) => player.gamesPlayed > 0);

  return (
    <section className="view-stack">
      <DashboardPanel padding="spacious" tone="accent">
        <SectionHeading
          copy="People surfaces for this account: who is on the roster, how they are rated, and where their full profiles live."
          eyebrow="Players"
          title="Roster"
        />
      </DashboardPanel>

      <div className="metric-grid">
        <MetricCard
          accent="var(--blue)"
          label="Players"
          value={roster.players.length}
        />
        <MetricCard label="Groups" value={roster.groups.length} />
        <MetricCard
          accent="var(--gold)"
          detail="Players with at least one rated game."
          label="Rated players"
          value={ratedPlayers.length}
        />
      </div>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading eyebrow="Surfaces" title="Player surfaces" />
          <HubTileGrid tiles={PLAYERS_HUB_TILES} />
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy="Roster and group membership are managed in the Moonrakers app. This dashboard reads them."
            eyebrow="Note"
            title="Managing the roster"
          />
        </div>
      </DashboardPanel>
    </section>
  );
}
