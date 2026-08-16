import type { StatsScreenPayload } from "@moonrakers/analytics-contract";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

type StatsTab = "correlations" | "games" | "overview" | "players" | "playstyle";

const tabs: Array<{ key: StatsTab; label: string }> = [
  { key: "overview", label: "Home" },
  { key: "players", label: "Players" },
  { key: "playstyle", label: "Playstyle" },
  { key: "correlations", label: "Correlations" },
  { key: "games", label: "Games" },
];

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

function extractScalarEntries(value: unknown) {
  return Object.entries(asRecord(value))
    .filter(([, entry]) => typeof entry === "string" || typeof entry === "number")
    .map(([key, entry]) => ({
      key,
      label: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " "),
      value: String(entry),
    }));
}

function extractCorrelationEntries(value: unknown) {
  const section = asRecord(value);
  const combined = [
    ...asArray(section.entries),
    ...asArray(section.items),
    ...asArray(section.pairing),
    ...asArray(section.macro),
  ];

  return combined.map((entry, index) => {
    const row = asRecord(entry);

    return {
      key: toText(row.key ?? row.metricKey ?? row.label, `correlation-${index}`),
      label: toText(row.label ?? row.title ?? row.metricLabel, `Correlation ${index + 1}`),
      value: toText(row.value ?? row.score ?? row.strength, "Signal"),
      meaning: toText(row.meaning ?? row.summary ?? row.description, "Correlation read"),
    };
  });
}

function extractGameEntries(value: unknown) {
  const section = asRecord(value);
  const itemEntries = asArray(section.items).map((entry, index) => {
    const row = asRecord(entry);
    return {
      key: toText(row.key ?? row.id ?? row.label, `game-${index}`),
      label: toText(row.label ?? row.title ?? row.metricLabel, `Game ${index + 1}`),
      value: toText(
        row.value ?? row.summary ?? row.description ?? row.body,
        "Tracked game",
      ),
    };
  });

  if (itemEntries.length > 0) {
    return itemEntries;
  }

  const summary = toText(section.summary);
  if (summary) {
    return [
      {
        key: "summary",
        label: "Summary",
        value: summary,
      },
    ];
  }

  return extractScalarEntries(value);
}

export function StatsView({ payload }: { payload: StatsScreenPayload }) {
  const overviewCards = payload.overview.cards;
  const topSignals = payload.overview.topSignals;
  const playerOptions = payload.players.options;
  const playerDetailEntries = extractScalarEntries(payload.players.detail);
  const playstyleEntries = extractScalarEntries(payload.playstyle);
  const correlationEntries = extractCorrelationEntries(payload.correlations);
  const gameEntries = extractGameEntries(payload.games);

  return (
    <section className="view-stack">
      <SectionHeading
        eyebrow="Stats"
        title="League readout"
        copy={payload.overview.hero.takeaway}
      />

      <nav
        aria-label="Stats sections"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {tabs.map((tab) => {
          return (
            <a
              key={tab.key}
              href={`#stats-${tab.key}`}
              style={{
                padding: "0.8rem 1rem",
                borderRadius: "999px",
                border: `1px solid ${
                  tab.key === "correlations"
                    ? "rgba(168, 85, 247, 0.42)"
                    : "var(--border)"
                }`,
                background:
                  tab.key === "correlations"
                    ? "linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(59, 130, 246, 0.14) 100%)"
                    : "rgba(255, 255, 255, 0.04)",
                color:
                  tab.key === "correlations"
                    ? "var(--text-strong)"
                    : "var(--text)",
                fontWeight: tab.key === "correlations" ? 700 : 600,
              }}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>

      <div className="view-stack" id="stats-correlations">
        <DashboardPanel tone="blue">
          <SectionHeading
            eyebrow="Correlations"
            title="Tactical intelligence"
            copy="Correlation rows stay visible as a first-class stats destination so the web dashboard highlights matchups, macro trends, and interaction signals immediately."
          />
        </DashboardPanel>
        {correlationEntries.length > 0 ? (
          <div className="metric-grid">
            {correlationEntries.map((entry) => (
              <DashboardPanel
                key={entry.key}
                as="article"
                tone="blue"
                style={{ display: "grid", gap: "0.6rem" }}
              >
                <p className="section-eyebrow" style={{ margin: 0 }}>
                  {entry.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-strong)",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                  }}
                >
                  {entry.value}
                </p>
                <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.65 }}>
                  {entry.meaning}
                </p>
              </DashboardPanel>
            ))}
          </div>
        ) : (
          <EmptyStatePanel
            eyebrow="Correlations"
            title="No tactical rows returned"
            copy="The correlations tab is reserved and visible even when the current payload has not yet published pairing or macro entries."
          />
        )}
      </div>

      <div className="view-stack" id="stats-overview">
        <DashboardPanel tone="success">
          <SectionHeading
            eyebrow="Home"
            title="Overview cards"
            copy={`Tracked players: ${payload.overview.hero.players} • Logged games: ${payload.overview.hero.games}`}
          />
        </DashboardPanel>
        {overviewCards.length > 0 ? (
          <div className="metric-grid">
            {overviewCards.map((card) => (
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
            eyebrow="Overview ready"
            title="No overview cards returned"
            copy="The stats contract is connected, but this profile does not currently expose overview cards."
          />
        )}
        {topSignals.length > 0 ? (
          <div className="metric-grid">
            {topSignals.map((signal) => (
              <DashboardPanel
                key={signal.key}
                as="article"
                tone="accent"
                style={{ display: "grid", gap: "0.55rem" }}
              >
                <p className="section-eyebrow" style={{ margin: 0 }}>
                  {signal.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-strong)",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                  }}
                >
                  {signal.value}
                </p>
                <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.6 }}>
                  {signal.meaning}
                </p>
              </DashboardPanel>
            ))}
          </div>
        ) : null}
      </div>

      <div className="view-stack" id="stats-players">
        <DashboardPanel tone="blue">
          <SectionHeading
            eyebrow="Players"
            title="Focused player detail"
            copy={`Selected player: ${payload.players.selectedPlayerId ?? "None yet"} • Options: ${playerOptions.length}`}
          />
        </DashboardPanel>
        {playerDetailEntries.length > 0 ? (
          <div className="metric-grid">
            {playerDetailEntries.map((entry) => (
              <MetricCard key={entry.key} label={entry.label} value={entry.value} />
            ))}
          </div>
        ) : (
          <EmptyStatePanel
            eyebrow="Players"
            title="No player detail returned"
            copy="The shared player picker contract is wired, but this payload did not include a focused player detail block."
          />
        )}
      </div>

      <div className="view-stack" id="stats-playstyle">
        <DashboardPanel tone="accent">
          <SectionHeading
            eyebrow="Playstyle"
            title="How the table tends to win"
            copy="This section preserves the playstyle lane as its own command-table surface instead of blending it into a generic summary."
          />
        </DashboardPanel>
        {playstyleEntries.length > 0 ? (
          <div className="metric-grid">
            {playstyleEntries.map((entry) => (
              <MetricCard key={entry.key} label={entry.label} value={entry.value} />
            ))}
          </div>
        ) : (
          <EmptyStatePanel
            eyebrow="Playstyle"
            title="No playstyle detail returned"
            copy="The stats contract did not include scalar playstyle fields for this payload yet."
          />
        )}
      </div>

      <div className="view-stack" id="stats-games">
        <DashboardPanel tone="default">
          <SectionHeading
            eyebrow="Games"
            title="Table history"
            copy="Game-level summaries stay separated from correlations so you can distinguish event volume from signal interpretation."
          />
        </DashboardPanel>
        {gameEntries.length > 0 ? (
          <div className="metric-grid">
            {gameEntries.map((entry) => (
              <MetricCard key={entry.key} label={entry.label} value={entry.value} />
            ))}
          </div>
        ) : (
          <EmptyStatePanel
            eyebrow="Games"
            title="No game summaries returned"
            copy="The stats route is active, but the current payload did not include scalar game summary rows."
          />
        )}
      </div>
    </section>
  );
}
