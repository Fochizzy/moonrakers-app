"use client";

import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDateTime } from "@/lib/formatDateTime";
import type { GameSummary } from "@/lib/games/gameSummary";

type GameSummaryViewProps = {
  gameId: string;
  summary: GameSummary;
};

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.4rem",
        padding: "0.35rem 0.7rem",
        borderRadius: "0.7rem",
        border: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.04)",
        fontSize: "0.84rem",
      }}
    >
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ color: "var(--text-strong)", fontWeight: 700 }}>{value}</span>
    </span>
  );
}

export function GameSummaryView({ gameId, summary }: GameSummaryViewProps) {
  const title =
    summary.groupName ?? (summary.createdAt ? "Saved game" : "Completed match");

  return (
    <section className="view-stack">
      <DashboardPanel padding="spacious" tone="accent">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            action={
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link
                  href={`/history?gameId=${encodeURIComponent(gameId)}`}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: "0.9rem",
                    border: "1px solid var(--border-strong)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text)",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                  }}
                >
                  Back to History
                </Link>
                <Link
                  href={`/game-trends/${encodeURIComponent(gameId)}`}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: "0.9rem",
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    background: "rgba(168, 85, 247, 0.14)",
                    color: "var(--text-strong)",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                  }}
                >
                  Game Trends
                </Link>
              </div>
            }
            copy="Final standings, per-player totals, and the full turn-by-turn replay for this saved game."
            eyebrow="Game Summary"
            title={title}
          />
          <p
            style={{ margin: 0, color: "var(--sub)", fontSize: "0.95rem" }}
            suppressHydrationWarning
          >
            {formatDateTime(summary.createdAt)}
          </p>
        </div>
      </DashboardPanel>

      <div className="metric-grid">
        <MetricCard label="Players" value={summary.playerCount} />
        <MetricCard label="Rounds" value={summary.roundCount} />
        <MetricCard
          accent="var(--gold)"
          label="Winner"
          value={summary.winnerName ?? "—"}
        />
      </div>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading eyebrow="Quick view" title="Highlights" />
          <div className="metric-grid">
            {summary.highlights.map((highlight) => (
              <div
                key={highlight.label}
                style={{
                  display: "grid",
                  gap: "0.3rem",
                  padding: "1rem",
                  borderRadius: "1rem",
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  {highlight.label}
                </span>
                <span
                  style={{
                    color: "var(--text-strong)",
                    fontSize: "1.2rem",
                    fontWeight: 800,
                  }}
                >
                  {highlight.name}
                </span>
                <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>
                  {highlight.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy={`${summary.standings.length} players ranked by total prestige, then score.`}
            eyebrow="Results"
            title="Final standings"
          />

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {summary.standings.map((row) => (
              <article
                key={row.id}
                style={{
                  display: "grid",
                  gap: "0.7rem",
                  padding: "1rem 1.1rem",
                  borderRadius: "1.1rem",
                  border: `1px solid ${
                    row.isWinner ? "rgba(45, 212, 191, 0.5)" : "var(--border)"
                  }`,
                  background: row.isWinner
                    ? "rgba(45, 212, 191, 0.08)"
                    : "rgba(255, 255, 255, 0.03)",
                  borderLeft: `4px solid ${row.color?.trim() || "var(--accent)"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.9rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "2.2rem",
                        height: "2.2rem",
                        borderRadius: "999px",
                        border: "1px solid var(--border-strong)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "var(--text-strong)",
                        fontWeight: 800,
                      }}
                    >
                      #{row.rank}
                    </span>
                    <span style={{ display: "grid" }}>
                      <span
                        style={{
                          color: "var(--text-strong)",
                          fontSize: "1.1rem",
                          fontWeight: 700,
                        }}
                      >
                        {row.name}
                      </span>
                      <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>
                        {row.totalPrestige} prestige · {row.score} score
                      </span>
                    </span>
                  </div>

                  {row.isWinner ? (
                    <span className="dashboard-chip">Winner</span>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  <StatPill label="Direct" value={row.directPrestige} />
                  <StatPill label="Assist In" value={row.assistPrestigeReceived} />
                  <StatPill label="Assist Out" value={row.assistPrestigeSent} />
                  <StatPill label="Objectives" value={row.objectivePrestige} />
                  <StatPill label="Contracts" value={row.contracts} />
                  <StatPill label="Assists" value={row.assists} />
                  <StatPill label="Failures" value={row.failures} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy={`${summary.replayRows.length} logged turns, in the order they were played.`}
            eyebrow="Replay"
            title="Turn-by-turn flow"
          />

          {summary.replayRows.length === 0 ? (
            <EmptyStatePanel
              copy="No round-level detail was saved for this game. Games imported without a timeline only carry final totals."
              eyebrow="Replay"
              title="No timeline data"
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.92rem",
                  minWidth: "44rem",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Turn",
                      "Player",
                      "Prestige",
                      "Objectives",
                      "Contracts",
                      "Assists out",
                      "Assist prestige out",
                      "Failures",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          textAlign: heading === "Player" ? "left" : "right",
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border-strong)",
                          color: "var(--muted)",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.replayRows.map((row) => (
                    <tr key={row.key}>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--sub)",
                          textAlign: "right",
                        }}
                      >
                        {row.step}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--text-strong)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            display: "inline-block",
                            width: "0.5rem",
                            height: "0.5rem",
                            borderRadius: "999px",
                            marginRight: "0.5rem",
                            background: row.color?.trim() || "var(--blue)",
                          }}
                        />
                        {row.playerName}
                      </td>
                      {[
                        row.prestige,
                        row.objectivePrestige,
                        row.contracts,
                        row.assistsGiven,
                        row.assistPrestigeSent,
                        row.failures,
                      ].map((value, index) => (
                        <td
                          key={`${row.key}-${index}`}
                          style={{
                            padding: "0.6rem 0.75rem",
                            borderBottom: "1px solid var(--border)",
                            color: "var(--text)",
                            textAlign: "right",
                          }}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardPanel>
    </section>
  );
}
