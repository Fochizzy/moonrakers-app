"use client";

import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/formatDateTime";
import { formatSigned } from "@/lib/formatNumber";
import type { GameTrends } from "@/lib/games/gameTrends";
import { assignDistinctAccents } from "@/lib/playerColor";

type GameTrendsViewProps = {
  createdAt: number;
  gameId: string;
  roundCount: number;
  trends: GameTrends;
  winnerName: string | null;
};

const RACE_WIDTH = 720;
const RACE_HEIGHT = 220;
const RACE_PAD = { bottom: 24, left: 34, right: 12, top: 12 };

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/**
 * The prestige race was a 21-row table of "James / 5 / +3 / No", which is a
 * chart's worth of data spent on a wall of text. The table stays underneath for
 * anyone who wants the exact numbers.
 */
function PrestigeRaceChart({
  accents,
  points,
  seatRows,
}: {
  accents: Record<string, string>;
  points: GameTrends["prestigeTrend"];
  seatRows: GameTrends["seatRows"];
}) {
  if (points.length < 2) {
    return null;
  }

  const maxRound = points.length;
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => Object.values(point.values)),
  );
  const plotWidth = RACE_WIDTH - RACE_PAD.left - RACE_PAD.right;
  const plotHeight = RACE_HEIGHT - RACE_PAD.top - RACE_PAD.bottom;
  const xFor = (round: number) =>
    RACE_PAD.left +
    (maxRound === 1 ? plotWidth / 2 : ((round - 1) / (maxRound - 1)) * plotWidth);
  const yFor = (value: number) =>
    RACE_PAD.top + plotHeight - (value / maxValue) * plotHeight;

  const leadChangeRounds = points
    .filter((point, index) => {
      const previous = points[index - 1];
      return previous && previous.leaderId !== point.leaderId;
    })
    .map((point) => point.round);

  return (
    <svg
      aria-label="Running prestige by round"
      role="img"
      style={{ width: "100%", height: "auto" }}
      viewBox={`0 0 ${RACE_WIDTH} ${RACE_HEIGHT}`}
    >
      {[0, 0.5, 1].map((fraction) => {
        const y = RACE_PAD.top + plotHeight * (1 - fraction);
        return (
          <g key={fraction}>
            <line
              stroke="rgba(255,255,255,0.08)"
              x1={RACE_PAD.left}
              x2={RACE_WIDTH - RACE_PAD.right}
              y1={y}
              y2={y}
            />
            <text
              fill="rgba(148,163,184,0.9)"
              fontSize="10"
              textAnchor="end"
              x={RACE_PAD.left - 6}
              y={y + 3}
            >
              {Math.round(maxValue * fraction)}
            </text>
          </g>
        );
      })}

      {leadChangeRounds.map((round) => (
        <line
          key={`lead-${round}`}
          stroke="rgba(168,85,247,0.4)"
          strokeDasharray="3 3"
          x1={xFor(round)}
          x2={xFor(round)}
          y1={RACE_PAD.top}
          y2={RACE_PAD.top + plotHeight}
        />
      ))}

      {seatRows.map((seat) => {
        const path = points
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"} ${xFor(point.round).toFixed(1)} ${yFor(
                point.values[seat.id] ?? 0,
              ).toFixed(1)}`,
          )
          .join(" ");
        const lastPoint = points[points.length - 1];

        return (
          <g key={seat.id}>
            <path
              d={path}
              fill="none"
              stroke={accents[seat.id] ?? "var(--blue)"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={seat.isWinner ? 2.75 : 1.75}
            />
            {lastPoint ? (
              <circle
                cx={xFor(lastPoint.round)}
                cy={yFor(lastPoint.values[seat.id] ?? 0)}
                fill={accents[seat.id] ?? "var(--blue)"}
                r={seat.isWinner ? 4 : 3}
              />
            ) : null}
          </g>
        );
      })}

      <text
        fill="rgba(148,163,184,0.9)"
        fontSize="10"
        x={RACE_PAD.left}
        y={RACE_HEIGHT - 6}
      >
        Round 1
      </text>
      <text
        fill="rgba(148,163,184,0.9)"
        fontSize="10"
        textAnchor="end"
        x={RACE_WIDTH - RACE_PAD.right}
        y={RACE_HEIGHT - 6}
      >
        Round {maxRound}
      </text>
    </svg>
  );
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
            {formatDateTime(createdAt)} · {roundCount} rounds ·{" "}
            {winnerName ? `Winner ${winnerName}` : "No winner recorded"}
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
          <div className="stack-md">
            <PrestigeRaceChart
              accents={accents}
              points={trends.prestigeTrend}
              seatRows={trends.seatRows}
            />

            <div className="pill-row">
              {trends.seatRows.map((row) => (
                <span className="chip" key={`legend-${row.id}`}>
                  <span
                    aria-hidden="true"
                    className="chip__dot"
                    style={{ background: accents[row.id] }}
                  />
                  {row.name}
                  <span className="chip__num">{row.totalPrestige}</span>
                </span>
              ))}
            </div>

            <details className="details">
              <summary className="details__summary">
                Round-by-round leader table
              </summary>
              <div className="table-scroll" style={{ marginTop: "var(--s3)" }}>
                <table className="data-table data-table--compact">
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
                        <td className="col-text is-strong">
                          {row.projectedWinnerName}
                        </td>
                        <td>{row.projectedTotal}</td>
                        <td>{formatSigned(row.margin)}</td>
                        <td className={row.correct ? "is-good" : "is-muted"}>
                          {row.correct ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </DashboardPanel>
    </section>
  );
}
