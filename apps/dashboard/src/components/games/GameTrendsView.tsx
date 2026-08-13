"use client";

import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/formatDateTime";
import type { GameTrends } from "@/lib/games/gameTrends";
import { assignDistinctAccents } from "@/lib/playerColor";

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

function Meter({ accent, ratio }: { accent: string; ratio: number }) {
  return (
    <span className="meter">
      <span
        className="meter__fill"
        style={
          {
            width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
            "--meter-color": accent,
          } as React.CSSProperties
        }
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
  const accents = assignDistinctAccents(trends.seatRows);
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
      <PageHeader
        actions={
          <>
            <Link
              className="btn btn--primary"
              href={`/summary/${encodeURIComponent(gameId)}`}
            >
              Summary
            </Link>
            <Link
              className="btn"
              href={`/history?gameId=${encodeURIComponent(gameId)}`}
            >
              Back to History
            </Link>
          </>
        }
        copy="Seat-by-seat production, contract reliability, and how the prestige race actually unfolded."
        eyebrow="Postgame"
        meta={
          <span suppressHydrationWarning>
            {formatDateTime(createdAt)} · {roundCount} rounds · Winner{" "}
            {winnerName ?? "Unknown"}
          </span>
        }
        title="Game Trends & Breakdown"
      />

      <div className="stat-grid">
        <MetricCard label="Rounds" value={roundCount} />
        <MetricCard label="Lead changes" value={leadChanges} />
        <MetricCard
          accent="var(--gold)"
          detail="How often the running leader was the eventual winner."
          label="Leader held"
          value={percent(trends.predictionAccuracy)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: "var(--s5)",
          gridTemplateColumns: "repeat(auto-fit, minmax(22rem, 1fr))",
        }}
      >
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Turn order
              </p>
              <h2 className="panel-title">Seat effect</h2>
            </div>
          </div>

          <div className="stack-md">
            {trends.seatRows.map((row) => (
              <div className="stack-sm" key={row.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span className="statline__value">
                    Seat {row.seat} · {row.name}
                    {row.isWinner ? " · Winner" : ""}
                  </span>
                  <span className="row__meta">
                    {row.totalPrestige} prestige · {row.directPrestige} direct ·{" "}
                    {row.assistPrestigeReceived} assist in · {row.score} score
                  </span>
                </div>
                <Meter
                  accent={accents[row.id]!}
                  ratio={row.totalPrestige / maxSeatPrestige}
                />
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Reliability
              </p>
              <h2 className="panel-title">Contracts vs failures</h2>
            </div>
          </div>

          <div className="stack-md">
            {trends.contractRows.map((row) => (
              <div className="stack-sm" key={row.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span className="statline__value">{row.name}</span>
                  <span className="row__meta">
                    {row.contracts} succeeded · {row.failures} failed ·{" "}
                    {row.attempts > 0 ? percent(row.successRate) : "no attempts"}
                  </span>
                </div>
                <Meter accent={accents[row.id]!} ratio={row.successRate} />
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Race
            </p>
            <h2 className="panel-title">Running leader</h2>
          </div>
          <span className="panel-count">
            {trends.predictionRows.length} logged rounds
          </span>
        </div>

        {trends.predictionRows.length === 0 ? (
          <EmptyStatePanel
            copy="This game was saved without round-level detail, so the prestige race cannot be reconstructed."
            eyebrow="Race"
            title="No round timeline"
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th className="col-text">Leader</th>
                  <th>Prestige</th>
                  <th>Margin</th>
                  <th>Held to the end</th>
                </tr>
              </thead>
              <tbody>
                {trends.predictionRows.map((row) => (
                  <tr key={row.round}>
                    <td className="is-muted">{row.round}</td>
                    <td className="col-text is-strong">{row.projectedWinnerName}</td>
                    <td>{row.projectedTotal}</td>
                    <td>+{row.margin}</td>
                    <td className={row.correct ? "is-good" : "is-muted"}>
                      {row.correct ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
    </section>
  );
}
