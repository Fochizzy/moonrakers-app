import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatCount, formatDecimal } from "@/lib/formatNumber";
import type { PreviewStatFamily } from "@/lib/preview/previewCatalog";

import {
  PREVIEW_CREW,
  PREVIEW_LEAGUE_ROWS,
  PREVIEW_LEAGUE_SUMMARY,
  PREVIEW_SAMPLE_NOTE,
} from "./previewData";
import {
  PREVIEW_INTEL_READS,
  PREVIEW_MACRO_ROWS,
  PREVIEW_METRIC_METHOD,
  PREVIEW_METRIC_ROWS,
  PREVIEW_TABLE_SIGNALS,
  type PreviewMetricRow,
} from "./previewMetrics";

function formatMetric(row: PreviewMetricRow, value: number) {
  if (row.format === "count") {
    return formatCount(Math.round(value));
  }
  if (row.format === "percent") {
    return `${formatDecimal(value, 1)}%`;
  }
  return formatDecimal(value, 1);
}

/** The best cell in a row, so a reader can find the answer without scanning. */
function leaderIdFor(row: PreviewMetricRow) {
  if (!row.leader) {
    return null;
  }

  const entries = Object.entries(row.values);
  const ranked = entries.sort(([, left], [, right]) =>
    row.leader === "high" ? right - left : left - right,
  );

  return ranked[0]?.[0] ?? null;
}

export function StatsPreview({ families }: { families: PreviewStatFamily[] }) {
  const summary = PREVIEW_LEAGUE_SUMMARY;
  const accentFor = (playerId: string) =>
    PREVIEW_CREW.find((member) => member.id === playerId)?.accent;

  return (
    <div className="view-stack">
      <DashboardPanel padding="normal" tone="accent">
        <SectionHeading
          copy={`The header of the signed-in Stats page, rendered exactly as it ships. ${PREVIEW_SAMPLE_NOTE}`}
          eyebrow="Live"
          title="League snapshot"
        />

        <div className="stat-grid">
          <MetricCard
            detail="Finished and saved"
            label="Tracked Games"
            value={formatCount(summary.totalGames)}
          />
          <MetricCard
            detail={`${formatCount(summary.seatsPlayed)} seats played`}
            label="Players"
            value={formatCount(summary.playerCount)}
          />
          <MetricCard
            detail="Across every player and game"
            label="Prestige Recorded"
            value={formatCount(summary.totalPrestige)}
          />
          <MetricCard
            detail="Per seat, per game"
            label="Prestige / Seat"
            value={formatDecimal(summary.prestigePerSeat, 1)}
          />
          <MetricCard
            accent="var(--gold)"
            detail={`${formatCount(summary.assistCount)} assists exchanged`}
            label="Assist Share"
            value={`${formatDecimal(summary.assistShareOfPrestige, 1)}%`}
          />
          {/* A real dead heat renders as "0 prestige", which reads like a
              missing value rather than the tightest possible finish. */}
          <MetricCard
            accent="var(--blue)"
            detail={
              summary.closestMargin === 0
                ? `${summary.closestGameLabel} finished level on prestige`
                : `Closest finish, in ${summary.closestGameLabel}`
            }
            label="Tightest Finish"
            value={
              summary.closestMargin === 0
                ? "Tied"
                : `${formatCount(summary.closestMargin)} prestige`
            }
          />
        </div>
      </DashboardPanel>

      <DashboardPanel padding="normal">
        <SectionHeading
          copy="Every player carries a rating, a record, and a production rate."
          eyebrow="Live"
          title="Ratings table"
        />

        <div className="table-scroll">
          <table className="data-table preview-table">
            <thead>
              <tr>
                <th className="col-text">#</th>
                <th className="col-text">Player</th>
                <th>Games</th>
                <th>Wins</th>
                <th>Win Rate</th>
                <th>Prestige / Game</th>
                <th>Score / Game</th>
                <th>ELO</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_LEAGUE_ROWS.map((row, index) => (
                <tr key={row.id}>
                  <td className="col-text is-muted">{index + 1}</td>
                  <td className="col-text is-strong">
                    <span className="preview-table__player">
                      <span
                        aria-hidden="true"
                        className="preview-table__dot"
                        style={{ background: accentFor(row.id) }}
                      />
                      {row.name}
                    </span>
                  </td>
                  <td>{formatCount(row.games)}</td>
                  <td>{formatCount(row.wins)}</td>
                  <td>{formatDecimal(row.winRate, 1)}%</td>
                  <td>{formatDecimal(row.prestigePerGame, 1)}</td>
                  <td>{formatDecimal(row.scorePerGame, 1)}</td>
                  <td className="is-strong">{formatCount(row.elo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      {/* Naming 148 metrics is not the same as showing one. This is the same
          catalog, filled in. */}
      <DashboardPanel padding="normal">
        <SectionHeading
          copy={`What a published metric actually returns: the catalog's own definition, answered for all four players. ${PREVIEW_METRIC_METHOD}`}
          eyebrow="Worked example"
          title="What the numbers look like"
        />

        <div className="table-scroll">
          <table className="data-table preview-metric-table">
            <thead>
              <tr>
                <th className="col-text">Metric</th>
                {PREVIEW_LEAGUE_ROWS.map((player) => (
                  <th key={player.id}>{player.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PREVIEW_METRIC_ROWS.map((metric) => {
                const leaderId = leaderIdFor(metric);

                return (
                  <tr key={metric.key}>
                    <td className="col-text">
                      <span className="preview-metric-cell">
                        <span className="preview-metric-name">
                          {metric.title}
                        </span>
                        <span className="preview-metric-family">
                          {metric.family}
                        </span>
                        <span className="preview-metric-body">
                          {metric.body}
                        </span>
                      </span>
                    </td>
                    {PREVIEW_LEAGUE_ROWS.map((player) => (
                      <td
                        className={
                          player.id === leaderId ? "is-strong" : undefined
                        }
                        key={player.id}
                      >
                        {formatMetric(metric, metric.values[player.id] ?? 0)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="preview-note">
          Bold is the leading value where one end of the row is the good end.
          Objective Share and Average Start Seat have no better end, so neither
          is marked.
        </p>
      </DashboardPanel>

      {/* What the user asked the app for in the first place: not the numbers,
          but what the numbers say about how they play. */}
      <DashboardPanel padding="normal" tone="accent">
        <SectionHeading
          copy="Beyond the totals, the app reads a player's pattern back to them. These are Moonrakers Intel entries, derived exactly as the catalog defines them."
          eyebrow="The read on your play"
          title="What it says about how you play"
        />

        <div className="preview-intel-grid">
          {PREVIEW_INTEL_READS.map((intel) => (
            <article className="preview-intel" key={intel.playerId}>
              <header className="preview-intel__head">
                <span
                  aria-hidden="true"
                  className="preview-intel__dot"
                  style={{ background: accentFor(intel.playerId) }}
                />
                <h3 className="preview-intel__name">{intel.playerName}</h3>
              </header>

              <dl className="preview-intel__reads">
                {intel.reads.map((read) => (
                  <div className="preview-intel__read" key={read.title}>
                    <dt title={read.body}>{read.title}</dt>
                    <dd>{read.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <div className="preview-signals">
          <h3 className="preview-signals__title">
            And what the table as a whole is doing
          </h3>
          <ul className="preview-signals__list">
            {PREVIEW_TABLE_SIGNALS.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>
          <p className="preview-note">
            Written by the app&rsquo;s own summary builder, not for this page.
            The macro factors behind it are the correlation between each thing a
            seat did and whether that seat won:{" "}
            {PREVIEW_MACRO_ROWS.map(
              (macro) => `${macro.label} ${formatDecimal(macro.value, 2)}`,
            ).join(" · ")}
            .
          </p>
        </div>
      </DashboardPanel>

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Catalog
            </p>
            <h2 className="panel-title">Every metric the app publishes</h2>
            <p className="panel-copy">
              Grouped the way the Definitions page groups them. Open a family to
              read every metric name in it; the worked definition of each one is
              on the Definitions page once you sign in.
            </p>
          </div>
          <span className="panel-count">
            {formatCount(
              families.reduce((total, family) => total + family.metricCount, 0),
            )}{" "}
            metrics · {families.length} families
          </span>
        </div>

        <div className="preview-family-grid">
          {families.map((family) => (
            <details className="preview-family" key={family.key}>
              <summary className="preview-family__summary">
                <span className="preview-family__title">{family.title}</span>
                <span className="preview-family__count">
                  {formatCount(family.metricCount)}
                  <span className="preview-family__count-unit"> metrics</span>
                </span>
                {/* The default disclosure marker is hidden for the layout, so
                    without this the cards read as static tiles. */}
                <span aria-hidden="true" className="preview-family__chevron" />
              </summary>
              <p className="preview-family__copy">{family.subtitle}</p>
              <ul className="preview-chips">
                {family.metricTitles.map((metricTitle) => (
                  <li className="preview-chip" key={metricTitle}>
                    {metricTitle}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </DashboardPanel>

    </div>
  );
}
