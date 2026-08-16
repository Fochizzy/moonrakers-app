import Link from "next/link";
import type {
  AnalyticsHomePayload,
  EloLeaderboardRow,
  EloSummary,
} from "@moonrakers/analytics-contract";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDateTime, formatShortDate } from "@/lib/formatDateTime";
import { formatCount, formatRating, formatRecord } from "@/lib/formatNumber";
import type { HistoryRow } from "@/lib/history/historyRows";
import { assignDistinctAccents } from "@/lib/playerColor";

type HomeViewProps = {
  focusName: string;
  leaderboardRows: EloLeaderboardRow[];
  payload: AnalyticsHomePayload;
  recentGames: HistoryRow[];
  summary: EloSummary | null;
  totalGames: number;
};

/**
 * Recent form arrives as a run of W/L characters with no stated direction, so
 * the newest result is called out rather than left for the reader to guess.
 */
function RecentForm({ value }: { value: string }) {
  const results = value.trim().toUpperCase().split("").filter((entry) => /[WLD]/.test(entry));

  if (results.length === 0) {
    return <span className="stat__value stat__value--text">—</span>;
  }

  return (
    <span className="form-run">
      {results.map((result, index) => (
        <span
          className={
            index === results.length - 1 ? "form-run__tick is-latest" : "form-run__tick"
          }
          data-result={result}
          key={`${result}-${index}`}
        >
          {result}
        </span>
      ))}
    </span>
  );
}

function summarizeLatest(games: HistoryRow[]) {
  const latest = games[0];
  if (!latest) {
    return "No finished games are saved to the cloud for this account yet.";
  }

  if (!latest.winnerName) {
    return `The last logged table ran ${latest.roundCount} rounds and saved no winner.`;
  }

  return `${latest.winnerName} took the last table with ${latest.winnerPrestige} prestige across ${latest.roundCount} rounds.`;
}

export function HomeView({
  focusName,
  leaderboardRows,
  payload,
  recentGames,
  summary,
  totalGames,
}: HomeViewProps) {
  const leader = leaderboardRows[0] ?? null;

  return (
    <section className="view-stack">
      <PageHeader
        copy={summarizeLatest(recentGames)}
        eyebrow="Command"
        meta={
          <span suppressHydrationWarning>
            {formatCount(totalGames)} games in the archive · published{" "}
            {formatDateTime(payload.generatedAt)}
          </span>
        }
        title={focusName}
      />

      <div className="stat-grid">
        <MetricCard
          accent="var(--blue)"
          detail="Players this analytics profile can see."
          label="Tracked players"
          value={formatCount(payload.hero.players)}
        />
        <MetricCard
          accent="var(--gold)"
          detail="Finished tables feeding the current readout."
          label="Logged games"
          value={formatCount(payload.hero.games)}
        />
        <MetricCard
          accent="var(--accent)"
          detail={
            summary
              ? `Peak ${formatRating(summary.peakElo)} · ${formatRecord(summary.wins, summary.losses)}`
              : "Rating appears once a rated game is saved."
          }
          label="Current ELO"
          value={summary ? formatRating(summary.currentElo) : "—"}
        />
        <MetricCard
          accent="var(--green)"
          detail={leader ? `${formatRating(leader.currentElo)} ELO` : undefined}
          label="Table leader"
          value={leader?.name ?? "—"}
        />
      </div>

      {summary?.recentForm ? (
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Form
              </p>
              <h2 className="panel-title">Recent results</h2>
              <p className="panel-copy">
                Most recent game on the right, highlighted.
              </p>
            </div>
            <span className="panel-count">
              {formatRecord(summary.wins, summary.losses)} lifetime
            </span>
          </div>
          <RecentForm value={summary.recentForm} />
        </DashboardPanel>
      ) : null}

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Archive
            </p>
            <h2 className="panel-title">Latest games</h2>
          </div>
          <Link className="btn" href="/history">
            All games
          </Link>
        </div>

        {recentGames.length > 0 ? (
          <div className="row-list">
            {recentGames.map((row) => {
              const accents = assignDistinctAccents(row.players);
              const winnerId =
                row.players.find((player) => player.isWinner)?.id ?? null;

              return (
                <article
                  className="row"
                  key={row.id}
                  style={
                    {
                      "--row-accent":
                        (winnerId && accents[winnerId]) || "var(--border-strong)",
                    } as React.CSSProperties
                  }
                >
                  <div className="row__head">
                    <div className="stack-sm" style={{ minWidth: 0 }}>
                      <span className="eyebrow">
                        Game {row.ordinal}
                        {row.groupName ? ` · ${row.groupName}` : ""}
                      </span>
                      <h3 className="row__title">
                        {row.winnerName
                          ? `${row.winnerName} won with ${formatCount(row.winnerPrestige)}`
                          : "No winner recorded"}
                      </h3>
                      <p className="row__meta" suppressHydrationWarning>
                        {formatShortDate(row.createdAt)} · {row.roundCount} rounds
                      </p>
                    </div>

                    <Link
                      className="btn btn--primary"
                      href={`/summary/${encodeURIComponent(row.id)}`}
                    >
                      Summary
                    </Link>
                  </div>

                  <div className="pill-row">
                    {row.players.map((player) => (
                      <span
                        className={player.isWinner ? "chip chip--win" : "chip"}
                        key={`${row.id}-${player.id}`}
                      >
                        <span
                          aria-hidden="true"
                          className="chip__dot"
                          style={{ background: accents[player.id] }}
                        />
                        {player.name}
                        <span className="chip__num">{player.totalPrestige}</span>
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyStatePanel
            copy="Play and save a game in the Moonrakers app and it will appear here."
            eyebrow="Archive"
            title="No finished games yet"
          />
        )}
      </DashboardPanel>

      {leaderboardRows.length > 0 ? (
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Standings
              </p>
              <h2 className="panel-title">Rating leaderboard</h2>
            </div>
            <Link className="btn" href="/elo">
              Full board
            </Link>
          </div>

          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="col-text">Player</th>
                  <th>ELO</th>
                  <th>Peak</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.map((row) => (
                  <tr key={row.playerId}>
                    <td className="is-muted">{row.rank}</td>
                    <td className="col-text is-strong">{row.name}</td>
                    <td>{formatRating(row.currentElo)}</td>
                    <td className="is-muted">{formatRating(row.peakElo)}</td>
                    <td>{formatRecord(row.wins, row.losses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {payload.cards.length > 0 ? (
        <DashboardPanel padding="normal">
          <SectionHeading
            copy="The same summary cards the Moonrakers app publishes for this player."
            eyebrow="Fleet snapshot"
            title="Published signals"
          />
          <div className="stat-grid">
            {payload.cards.map((card) => (
              <MetricCard
                accent={card.accent}
                detail={card.detail}
                key={card.key}
                label={card.label}
                value={card.value}
              />
            ))}
          </div>
        </DashboardPanel>
      ) : null}
    </section>
  );
}
