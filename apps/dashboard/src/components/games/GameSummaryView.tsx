"use client";

import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDateTime } from "@/lib/formatDateTime";
import type { GameSummary } from "@/lib/games/gameSummary";
import { assignDistinctAccents } from "@/lib/playerColor";

type GameSummaryViewProps = {
  gameId: string;
  summary: GameSummary;
};

const REPLAY_COLUMNS = [
  "Turn",
  "Player",
  "Prestige",
  "Objectives",
  "Contracts",
  "Assists out",
  "Assist prestige out",
  "Failures",
];

export function GameSummaryView({ gameId, summary }: GameSummaryViewProps) {
  const accents = assignDistinctAccents(summary.standings);
  const title =
    summary.groupName ?? (summary.createdAt ? "Saved game" : "Completed match");

  return (
    <section className="view-stack">
      <PageHeader
        actions={
          <>
            <Link
              className="btn"
              href={`/history?gameId=${encodeURIComponent(gameId)}`}
            >
              Back to History
            </Link>
            <Link
              className="btn btn--primary"
              href={`/game-trends/${encodeURIComponent(gameId)}`}
            >
              Game Trends
            </Link>
          </>
        }
        copy="Final standings, per-player totals, and the full turn-by-turn replay for this saved game."
        eyebrow="Game Summary"
        meta={
          <span suppressHydrationWarning>{formatDateTime(summary.createdAt)}</span>
        }
        title={title}
      />

      <div className="stat-grid">
        <MetricCard label="Players" value={summary.playerCount} />
        <MetricCard label="Rounds" value={summary.roundCount} />
        <MetricCard
          accent="var(--gold)"
          label="Winner"
          value={summary.winnerName ?? "—"}
        />
      </div>

      <DashboardPanel padding="normal">
        <SectionHeading eyebrow="Quick view" title="Highlights" />
        <div className="stat-grid">
          {summary.highlights.map((highlight) => (
            <div className="tile" key={highlight.label}>
              <span className="stat__label">{highlight.label}</span>
              <span className="tile__title">{highlight.name}</span>
              <span className="tile__meta">{highlight.detail}</span>
            </div>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Results
            </p>
            <h2 className="panel-title">Final standings</h2>
          </div>
          <span className="panel-count">
            Ranked by total prestige, then score
          </span>
        </div>

        <div className="row-list">
          {summary.standings.map((row) => (
            <article
              className={row.isWinner ? "row row--focus" : "row"}
              key={row.id}
              style={
                {
                  "--row-accent": accents[row.id],
                } as React.CSSProperties
              }
            >
              <div className="row__head">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.7rem",
                    minWidth: 0,
                  }}
                >
                  <span
                    className="chip"
                    style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                  >
                    #{row.rank}
                  </span>
                  <span className="stack-sm">
                    <span className="row__title">{row.name}</span>
                    <span className="row__meta">
                      {row.totalPrestige} prestige · {row.score} score
                    </span>
                  </span>
                </div>

                {row.isWinner ? <span className="chip chip--win">Winner</span> : null}
              </div>

              <div className="statline">
                <span className="statline__item">
                  <span className="statline__label">Direct</span>
                  <span className="statline__value">{row.directPrestige}</span>
                </span>
                <span className="statline__item">
                  <span className="statline__label">Assist in</span>
                  <span className="statline__value">
                    {row.assistPrestigeReceived}
                  </span>
                </span>
                <span className="statline__item">
                  <span className="statline__label">Assist out</span>
                  <span className="statline__value">{row.assistPrestigeSent}</span>
                </span>
                <span className="statline__item">
                  <span className="statline__label">Objectives</span>
                  <span className="statline__value">{row.objectivePrestige}</span>
                </span>
                <span className="statline__item">
                  <span className="statline__label">Contracts</span>
                  <span className="statline__value">{row.contracts}</span>
                </span>
                <span className="statline__item">
                  <span className="statline__label">Assists</span>
                  <span className="statline__value">{row.assists}</span>
                </span>
                <span className="statline__item">
                  <span className="statline__label">Failures</span>
                  <span className="statline__value">{row.failures}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Replay
            </p>
            <h2 className="panel-title">Turn-by-turn flow</h2>
          </div>
          <span className="panel-count">{summary.replayRows.length} turns</span>
        </div>

        {summary.replayRows.length === 0 ? (
          <EmptyStatePanel
            copy="No round-level detail was saved for this game. Games imported without a timeline only carry final totals."
            eyebrow="Replay"
            title="No timeline data"
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {REPLAY_COLUMNS.map((heading) => (
                    <th
                      className={heading === "Player" ? "col-text" : undefined}
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.replayRows.map((row) => (
                  <tr key={row.key}>
                    <td className="is-muted">{row.step}</td>
                    <td className="col-text is-strong">
                      <span
                        aria-hidden="true"
                        className="chip__dot"
                        style={{
                          display: "inline-block",
                          marginRight: "0.45rem",
                          background: accents[row.playerId] ?? "var(--blue)",
                        }}
                      />
                      {row.playerName}
                    </td>
                    <td>{row.prestige}</td>
                    <td>{row.objectivePrestige}</td>
                    <td>{row.contracts}</td>
                    <td>{row.assistsGiven}</td>
                    <td>{row.assistPrestigeSent}</td>
                    <td>{row.failures}</td>
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
