import type { InsightsScreenPayload } from "@moonrakers/analytics-contract";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    : [];
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}

function extractCorrelationNotes(value: unknown) {
  const correlations = asRecord(value);
  const combined = [
    ...asArray(correlations.items),
    ...asArray(correlations.pairing),
    ...asArray(correlations.macro),
  ];

  return combined.map((entry, index) => {
    const row = asRecord(entry);

    return {
      key: toText(row.key ?? row.metricKey ?? row.label, `correlation-${index}`),
      label: toText(row.label ?? row.title ?? row.metricLabel, `Correlation ${index + 1}`),
      body: toText(row.meaning ?? row.description ?? row.summary, "Correlation insight"),
    };
  });
}

export function InsightsView({ payload }: { payload: InsightsScreenPayload }) {
  const meta = asRecord(payload.meta);
  const cards = asArray((payload as Record<string, unknown>).cards);
  const topSignals = asArray((payload as Record<string, unknown>).topSignals);
  const relationships = asRecord(payload.relationships);
  const correlations = asRecord(payload.correlations);
  const relationshipSummary =
    toText(relationships.summary) ||
    toText(correlations.summary) ||
    "Server-authored relationship summaries will appear here.";
  const correlationNotes = extractCorrelationNotes(payload.correlations);
  const games = Number(meta.games ?? 0) || 0;

  return (
    <section className="view-stack">
      <SectionHeading
        eyebrow="Insights"
        title="Signals and relationships"
        copy={`Published over ${games} tracked games with correlation language kept alongside the main takeaways.`}
      />

      <DashboardPanel tone="accent">
        <SectionHeading
          eyebrow="Relationship Summary"
          title="Current table read"
          copy={relationshipSummary}
        />
      </DashboardPanel>

      {topSignals.length > 0 ? (
        <div className="metric-grid">
          {topSignals.map((signal, index) => {
            const row = asRecord(signal);
            const key = toText(row.key, `signal-${index}`);
            const label = toText(row.label, `Signal ${index + 1}`);
            const value = toText(row.value, "0");
            const meaning = toText(row.meaning, "Signal insight");

            return (
              <DashboardPanel
                key={key}
                as="article"
                tone="accent"
                style={{ display: "grid", gap: "0.6rem" }}
              >
                <p className="section-eyebrow" style={{ margin: 0 }}>
                  {label}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-strong)",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                  }}
                >
                  {value}
                </p>
                <p
                  style={{ margin: 0, color: "var(--sub)", lineHeight: 1.65 }}
                >
                  {meaning}
                </p>
              </DashboardPanel>
            );
          })}
        </div>
      ) : (
        <EmptyStatePanel
          eyebrow="Signals"
          title="No top signals returned"
          copy="The insights route is connected, but this payload did not include any top-signal cards yet."
        />
      )}

      {cards.length > 0 ? (
        <div className="metric-grid">
          {cards.map((card, index) => {
            const row = asRecord(card);
            const key = toText(row.key, `card-${index}`);
            const label = toText(row.label, `Metric ${index + 1}`);

            return (
              <MetricCard
                key={key}
                accent={toText(row.accent) || undefined}
                label={label}
                value={toText(row.value, "0")}
              />
            );
          })}
        </div>
      ) : null}

      {correlationNotes.length > 0 ? (
        <div className="view-stack">
          <SectionHeading
            eyebrow="Correlations"
            title="Published correlation language"
            copy="These notes keep the user-requested correlation coverage visible inside the insights route as well as the stats route."
          />
          <div className="metric-grid">
            {correlationNotes.map((entry) => (
              <DashboardPanel
                key={entry.key}
                as="article"
                tone="blue"
                style={{ display: "grid", gap: "0.55rem" }}
              >
                <p className="section-eyebrow" style={{ margin: 0 }}>
                  {entry.label}
                </p>
                <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.65 }}>
                  {entry.body}
                </p>
              </DashboardPanel>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
