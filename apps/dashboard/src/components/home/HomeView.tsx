import type { AnalyticsHomePayload } from "@moonrakers/analytics-contract";

import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function HomeView({
  focusName,
  payload,
}: {
  focusName: string;
  payload: AnalyticsHomePayload;
}) {
  const heroCards = [
    {
      key: "players",
      label: "Tracked Players",
      value: payload.hero.players,
      detail: "Published commanders included in this analytics profile.",
      accent: "var(--blue)",
    },
    {
      key: "games",
      label: "Logged Games",
      value: payload.hero.games,
      detail: "Finished Moonrakers tables feeding your current readout.",
      accent: "var(--gold)",
    },
    {
      key: "views",
      label: "Analytics Views",
      value: payload.hero.views,
      detail: "Primary report lanes currently surfaced by the companion site.",
      accent: "var(--accent)",
    },
  ] as const;

  return (
    <section className="view-stack">
      <section className="view-stack">
        <SectionHeading
          eyebrow="Focus player"
          title={focusName}
          copy="Track momentum swings, rival tendencies, and table-wide storylines for the currently selected Moonrakers pilot from the same analytics contract that powers the app."
          action={
            <div className="dashboard-chip">
              Published {formatGeneratedAt(payload.generatedAt)}
            </div>
          }
        />
        <div className="metric-grid">
          {heroCards.map((card) => (
            <MetricCard
              key={card.key}
              accent={card.accent}
              detail={card.detail}
              label={card.label}
              value={card.value}
            />
          ))}
        </div>
      </section>

      <section className="view-stack">
        <SectionHeading
          eyebrow="Fleet Snapshot"
          title="Analytics hero cards"
          copy="These cards mirror the published analytics home payload for the focused player, giving the web dashboard the same strategic summary language as the Moonrakers app."
        />

        {payload.cards.length > 0 ? (
          <div className="metric-grid">
            {payload.cards.map((card) => (
              <MetricCard
                key={card.key}
                accent={card.accent}
                label={card.label}
                value={card.value}
              />
            ))}
          </div>
        ) : (
          <EmptyStatePanel
            eyebrow="No hero cards yet"
            title="The dashboard is ready for your first analytics pull"
            copy="Once your published home payload includes hero cards, they will render here alongside the compare, charts, and correlation surfaces."
          />
        )}
      </section>
    </section>
  );
}
