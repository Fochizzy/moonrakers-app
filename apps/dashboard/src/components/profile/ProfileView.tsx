import Link from "next/link";
import type { PlayerProfileScreenPayload } from "@moonrakers/analytics-contract";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}

export function ProfileView({ payload }: { payload: PlayerProfileScreenPayload }) {
  const selectedPlayerId = payload.selectedPlayerId ?? payload.hero.id ?? "";
  const compareLabel = payload.quickActions?.compareLabel?.trim() || "Compare player";
  const profileSections = Object.entries(payload.tabs).map(([key, section]) => ({
    key,
    title: section.title,
    cards: section.cards,
  }));

  return (
    <section className="view-stack">
      <SectionHeading
        eyebrow="Profile"
        title={payload.hero.name}
        copy="Player profile keeps compare as a first-class action so the signed-in dashboard can jump straight from individual intel into side-by-side analysis."
        action={
          <Link
            href={`/compare?focusPlayerId=${encodeURIComponent(selectedPlayerId)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.85rem 1rem",
              borderRadius: "999px",
              border: "1px solid rgba(168, 85, 247, 0.34)",
              background:
                "linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%)",
              color: "var(--text-strong)",
              fontWeight: 700,
            }}
          >
            {compareLabel}
          </Link>
        }
      />

      <div className="metric-grid">
        <MetricCard label="Current ELO" value={payload.hero.currentElo} accent="var(--accent)" />
        <MetricCard label="Peak ELO" value={payload.hero.peakElo} accent="var(--blue)" />
        <MetricCard
          label="Win Rate"
          value={`${Math.round(payload.hero.winRate * 100)}%`}
          accent="var(--gold)"
        />
      </div>

      {payload.topCards.length > 0 ? (
        <div className="metric-grid">
          {payload.topCards.map((card) => (
            <MetricCard key={card.key} label={card.label} value={card.value} />
          ))}
        </div>
      ) : null}

      {payload.profileInsight ? (
        <DashboardPanel tone="accent">
          <SectionHeading
            eyebrow={payload.profileInsight.title}
            title="Profile insight"
            copy={payload.profileInsight.body}
          />
        </DashboardPanel>
      ) : null}

      {profileSections.length > 0 ? (
        <div className="view-stack">
          {profileSections.map((section) => (
            <DashboardPanel key={section.key} tone="blue">
              <SectionHeading
                eyebrow="Profile section"
                title={section.title}
                copy={`${section.cards.length} published cards in this section.`}
              />
              {section.cards.length > 0 ? (
                <div className="metric-grid" style={{ marginTop: "1rem" }}>
                  {section.cards.map((card) => (
                    <MetricCard key={card.key} label={card.label} value={card.value} />
                  ))}
                </div>
              ) : null}
            </DashboardPanel>
          ))}
        </div>
      ) : null}

      {payload.recentGames.length > 0 ? (
        <div className="view-stack">
          <SectionHeading
            eyebrow="Recent Games"
            title="Latest table history"
            copy="Recent games stay directly visible on web so the profile route remains actionable instead of collapsing into a static bio."
          />
          <div className="metric-grid">
            {payload.recentGames.map((entry, index) => {
              const game = asRecord(entry);

              return (
                <DashboardPanel
                  key={toText(game.id, `recent-game-${index}`)}
                  as="article"
                  tone="default"
                  style={{ display: "grid", gap: "0.55rem" }}
                >
                  <p className="section-eyebrow" style={{ margin: 0 }}>
                    {toText(game.result, "Game")}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                    }}
                  >
                    {toText(game.label ?? game.title, `Game ${index + 1}`)}
                  </p>
                  <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.65 }}>
                    {toText(game.summary ?? game.description, "Published recent-game detail.")}
                  </p>
                </DashboardPanel>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyStatePanel
          eyebrow="Recent Games"
          title="No recent games returned"
          copy="The profile route is connected, but the current payload did not include recent game rows."
        />
      )}
    </section>
  );
}
