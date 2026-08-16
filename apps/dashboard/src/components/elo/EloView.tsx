import type { EloScreenPayload } from "@moonrakers/analytics-contract";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  formatCount,
  formatDecimal,
  formatRating,
  formatRecord,
} from "@/lib/formatNumber";

const sortOptions = [
  ["elo", "ELO"],
  ["wins", "Wins"],
  ["games", "Games"],
  ["score", "Score"],
  ["prestige", "Prestige"],
  ["efficiency", "Efficiency"],
  ["avgPrestige", "Avg Prestige"],
] as const;

/** Newest result last, and said so — "LLLLW" alone gave no reading order. */
function RecentForm({ value }: { value: string }) {
  const results = value
    .trim()
    .toUpperCase()
    .split("")
    .filter((entry) => /[WLD]/.test(entry));

  if (results.length === 0) {
    return <>—</>;
  }

  return (
    <span className="form-run">
      {results.map((result, index) => (
        <span
          className={
            index === results.length - 1
              ? "form-run__tick is-latest"
              : "form-run__tick"
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

export function EloView({ payload }: { payload: EloScreenPayload }) {
  const selectedPlayerId = payload.selectedPlayerId ?? "";
  const selectedOpponentId = payload.selectedOpponentId ?? "";
  const currentEloByPlayerId = new Map(
    payload.leaderboardRows.map((row) => [row.playerId, row.currentElo] as const),
  );

  if (payload.summary?.playerId && typeof payload.summary.currentElo === "number") {
    currentEloByPlayerId.set(payload.summary.playerId, payload.summary.currentElo);
  }

  const playerOptions = payload.playerOptions.map((option) => ({
    ...option,
    currentElo: currentEloByPlayerId.get(option.id) ?? option.currentElo,
  }));
  const summary = payload.summary;

  return (
    <section className="view-stack">
      <PageHeader
        copy="Ratings across every finished game, with the filters the app uses."
        eyebrow="ELO"
        meta={`${formatCount(payload.leaderboardRows.length)} rated players`}
        title="Rating leaderboard"
      />

      <DashboardPanel padding="normal">
        <form className="toolbar">
          <label className="field toolbar__grow">
            <span className="field__label">Focus player</span>
            <select
              aria-label="Focus Player"
              className="select"
              defaultValue={selectedPlayerId}
              name="focusPlayerId"
            >
              <option value="">All pilots</option>
              {playerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {typeof option.currentElo === "number"
                    ? ` — ${formatRating(option.currentElo)} ELO`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="field toolbar__grow">
            <span className="field__label">Opponent</span>
            <select
              aria-label="Opponent"
              className="select"
              defaultValue={selectedOpponentId}
              name="opponentId"
            >
              <option value="">Any rival</option>
              {playerOptions
                .filter((option) => option.id !== selectedPlayerId)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {typeof option.currentElo === "number"
                      ? ` — ${formatRating(option.currentElo)} ELO`
                      : ""}
                  </option>
                ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Sort</span>
            <select
              aria-label="Sort"
              className="select"
              defaultValue={payload.sortKey}
              name="sortKey"
            >
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn--primary" type="submit">
            Update board
          </button>
        </form>
      </DashboardPanel>

      {summary ? (
        <div className="stat-grid">
          <MetricCard
            accent="var(--accent)"
            detail={`${formatCount(summary.gamesPlayed)} rated games`}
            label="Current ELO"
            value={formatRating(summary.currentElo)}
          />
          <MetricCard
            accent="var(--blue)"
            detail={`Best single game ${formatDecimal(summary.bestDelta, 0)}`}
            label="Peak ELO"
            value={formatRating(summary.peakElo)}
          />
          <MetricCard
            accent="var(--gold)"
            label="Record"
            value={formatRecord(summary.wins, summary.losses)}
          />
        </div>
      ) : payload.topCards.length > 0 ? (
        <div className="stat-grid">
          {payload.topCards.map((card) => (
            <MetricCard
              detail={card.sub ?? undefined}
              key={card.key}
              label={card.label}
              value={card.value}
            />
          ))}
        </div>
      ) : null}

      {summary?.recentForm ? (
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Form
              </p>
              <h2 className="panel-title">Last {summary.recentForm.length} games</h2>
              <p className="panel-copy">
                Oldest on the left; the most recent game is highlighted.
              </p>
            </div>
            <span className="panel-count">
              Avg change {formatDecimal(summary.avgDelta, 1)}
            </span>
          </div>
          <RecentForm value={summary.recentForm} />
        </DashboardPanel>
      ) : null}

      {payload.leaderboardRows.length > 0 ? (
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Leaderboard
              </p>
              <h2 className="panel-title">Published ranking rows</h2>
            </div>
            <span className="panel-count">
              Sorted by {payload.sortKey}
            </span>
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
                  <th>Games</th>
                  <th>Avg prestige</th>
                </tr>
              </thead>
              <tbody>
                {payload.leaderboardRows.map((row) => (
                  <tr key={row.playerId}>
                    <td className="is-muted">{row.rank}</td>
                    <td className="col-text is-strong">{row.name}</td>
                    <td>{formatRating(row.currentElo)}</td>
                    <td className="is-muted">{formatRating(row.peakElo)}</td>
                    <td>{formatRecord(row.wins, row.losses)}</td>
                    <td>{formatCount(row.gamesPlayed)}</td>
                    <td>{formatDecimal(row.avgPrestige, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : (
        <EmptyStatePanel
          copy={
            payload.emptyState?.description ??
            "Ratings appear once a finished game is saved to the cloud."
          }
          eyebrow="Leaderboard"
          title={payload.emptyState?.title ?? "No rated players yet"}
        />
      )}
    </section>
  );
}
