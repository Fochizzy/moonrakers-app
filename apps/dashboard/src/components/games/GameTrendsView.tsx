"use client";

import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDateTime } from "@/lib/formatDateTime";
import type { GameTrends } from "@/lib/games/gameTrends";

type GameTrendsViewProps = {
  createdAt: number;
  gameId: string;
  roundCount: number;
  trends: GameTrends;
  winnerName: string | null;
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function Bar({ color, ratio }: { color: string | null; ratio: number }) {
  const width = Math.max(0, Math.min(1, ratio)) * 100;

  return (
    <span
      style={{
        display: "block",
        height: "0.5rem",
        borderRadius: "999px",
        background: "rgba(255, 255, 255, 0.07)",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: `${width}%`,
          borderRadius: "999px",
          background: color?.trim() || "var(--accent)",
        }}
      />
    </span>
  );
}

export function GameTrendsView({
  createdAt,
  gameId,
  roundCount,
  trends,
  winnerName,
}: GameTrendsViewProps) {
  const maxSeatPrestige = Math.max(
    1,
    ...trends.seatRows.map((row) => row.totalPrestige),
  );
  const leadChanges = trends.prestigeTrend.reduce((count, point, index) => {
    const previous = trends.prestigeTrend[index - 1];
    return previous && previous.leaderId !== point.leaderId ? count + 1 : count;
  }, 0);

  return (
    <section className="view-stack">
      <DashboardPanel padding="spacious" tone="accent">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            action={
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link
                  href={`/summary/${encodeURIComponent(gameId)}`}
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
                  Summary
                </Link>
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
              </div>
            }
            copy="Seat-by-seat production, contract reliability, and how the prestige race actually unfolded."
            eyebrow="Postgame"
            title="Game Trends & Breakdown"
          />
          <p
            style={{ margin: 0, color: "var(--sub)", fontSize: "0.95rem" }}
            suppressHydrationWarning
          >
            {formatDateTime(createdAt)} · {roundCount} rounds · Winner{" "}
            {winnerName ?? "Unknown"}
          </p>
        </div>
      </DashboardPanel>

      <div className="metric-grid">
        <MetricCard label="Rounds" value={roundCount} />
        <MetricCard label="Lead changes" value={leadChanges} />
        <MetricCard
          accent="var(--gold)"
          detail="How often the running leader was the eventual winner."
          label="Leader held"
          value={percent(trends.predictionAccuracy)}
        />
      </div>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy="Final production by seat, in turn order."
            eyebrow="Turn order"
            title="Seat effect"
          />

          <div style={{ display: "grid", gap: "0.8rem" }}>
            {trends.seatRows.map((row) => (
              <div key={row.id} style={{ display: "grid", gap: "0.4rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "var(--text-strong)", fontWeight: 700 }}>
                    Seat {row.seat} · {row.name}
                    {row.isWinner ? " · Winner" : ""}
                  </span>
                  <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>
                    {row.totalPrestige} prestige · {row.directPrestige} direct ·{" "}
                    {row.assistPrestigeReceived} assist in · {row.score} score
                  </span>
                </div>
                <Bar
                  color={row.color}
                  ratio={row.totalPrestige / maxSeatPrestige}
                />
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy="Contract attempts and how many were converted."
            eyebrow="Reliability"
            title="Contracts vs failures"
          />

          <div style={{ display: "grid", gap: "0.8rem" }}>
            {trends.contractRows.map((row) => (
              <div key={row.id} style={{ display: "grid", gap: "0.4rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "var(--text-strong)", fontWeight: 700 }}>
                    {row.name}
                  </span>
                  <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>
                    {row.contracts} succeeded · {row.failures} failed ·{" "}
                    {row.attempts > 0 ? percent(row.successRate) : "no attempts"}
                  </span>
                </div>
                <Bar color={row.color} ratio={row.successRate} />
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy="Who was ahead after each logged round, and by how much."
            eyebrow="Race"
            title="Running leader"
          />

          {trends.predictionRows.length === 0 ? (
            <EmptyStatePanel
              copy="This game was saved without round-level detail, so the prestige race cannot be reconstructed."
              eyebrow="Race"
              title="No round timeline"
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.92rem",
                  minWidth: "34rem",
                }}
              >
                <thead>
                  <tr>
                    {["Round", "Leader", "Prestige", "Margin", "Held to the end"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{
                            textAlign: heading === "Leader" ? "left" : "right",
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
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {trends.predictionRows.map((row) => (
                    <tr key={row.round}>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--sub)",
                          textAlign: "right",
                        }}
                      >
                        {row.round}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--text-strong)",
                          fontWeight: 600,
                        }}
                      >
                        {row.projectedWinnerName}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--text)",
                          textAlign: "right",
                        }}
                      >
                        {row.projectedTotal}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--text)",
                          textAlign: "right",
                        }}
                      >
                        +{row.margin}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderBottom: "1px solid var(--border)",
                          color: row.correct ? "var(--gold)" : "var(--muted)",
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        {row.correct ? "Yes" : "No"}
                      </td>
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
