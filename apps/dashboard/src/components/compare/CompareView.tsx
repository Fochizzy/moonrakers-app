import Link from "next/link";
import type {
  ChartDatasetPayload,
  ChartSetupPayload,
} from "@moonrakers/analytics-contract";

import { asArray, asRecord, toNumber, toText } from "@/components/charts/chartUtils";
import { formatMetricLabel } from "@/components/charts/renderers/ChartLabels";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  buildChartControls,
  buildRenderableChartDataset,
} from "@/lib/charts/chartFallback";
import { formatShortDate } from "@/lib/formatDateTime";
import { formatCount, formatDecimal, formatSigned, MISSING } from "@/lib/formatNumber";

type CompareViewProps = {
  controls?: Partial<ChartSetupPayload["defaults"]>;
  dataset: ChartDatasetPayload;
  setup: {
    comparePlayerOptions: ChartSetupPayload["comparePlayerOptions"];
    defaults?: Partial<ChartSetupPayload["defaults"]>;
    focusPlayerOptions: ChartSetupPayload["focusPlayerOptions"];
  };
};

/**
 * The published dataset never carried a delta field, so every row read
 * "No delta". Both sides are numeric here, so the difference is computed
 * rather than looked up.
 */
/**
 * Millisecond epochs only. Anything smaller is a placeholder index rather than
 * a real save time, and formatting it produced dates in 1970.
 */
const EARLIEST_PLAUSIBLE_TIMESTAMP = 1_000_000_000_000;

function extractCompareRows(data: Record<string, unknown>) {
  return asArray(data.rows).map((entry, index) => {
    const row = asRecord(entry);
    const createdAt = toNumber(row.createdAt);
    const focusValue = toNumber(row.focusValue ?? row.focus ?? row.playerValue);
    const compareValue = toNumber(
      row.compareValue ?? row.compare ?? row.rivalValue,
    );
    const publishedDelta = toNumber(row.delta ?? row.impact);

    return {
      compareValue,
      createdAt:
        createdAt !== null && createdAt >= EARLIEST_PLAUSIBLE_TIMESTAMP
          ? createdAt
          : null,
      delta:
        publishedDelta ??
        (focusValue !== null && compareValue !== null
          ? focusValue - compareValue
          : null),
      focusValue,
      gameId: toText(row.gameId).trim(),
      key: toText(row.key ?? row.metricKey ?? row.label, `row-${index}`),
      label: toText(row.label ?? row.metricLabel ?? row.title, `Game ${index + 1}`),
    };
  });
}

export function CompareView({ controls, dataset, setup }: CompareViewProps) {
  const activeControls = buildChartControls({ dataset, setup, controls });
  const renderableDataset = buildRenderableChartDataset({
    chartKey: "compare",
    dataset,
    controls: activeControls,
  });
  const rows = extractCompareRows(renderableDataset.data);
  const selectedFocusPlayerId =
    activeControls.focusPlayerId ?? setup.focusPlayerOptions[0]?.key ?? "";
  const availableCompareOptions = setup.comparePlayerOptions.filter(
    (option) => option.key !== selectedFocusPlayerId,
  );
  const selectedComparePlayerId =
    activeControls.comparePlayerId &&
    activeControls.comparePlayerId !== selectedFocusPlayerId
      ? activeControls.comparePlayerId
      : (availableCompareOptions[0]?.key ?? "");

  // Cards that said "Focus" and "Rival" made the reader map roles back onto the
  // names sitting in the selectors directly above them.
  const focusName =
    setup.focusPlayerOptions.find((option) => option.key === selectedFocusPlayerId)
      ?.label ?? "Focus player";
  const rivalName =
    setup.comparePlayerOptions.find(
      (option) => option.key === selectedComparePlayerId,
    )?.label ?? "Rival";

  const metricLabel = formatMetricLabel(
    toText(asRecord(renderableDataset.data).metricKey, "score"),
  );
  const comparableRows = rows.filter((row) => row.delta !== null);
  const focusLed = comparableRows.filter((row) => (row.delta ?? 0) > 0).length;
  const rivalLed = comparableRows.filter((row) => (row.delta ?? 0) < 0).length;
  const tied = comparableRows.length - focusLed - rivalLed;
  const averageOf = (values: Array<number | null>) => {
    const numbers = values.filter((value): value is number => value !== null);
    return numbers.length === 0
      ? null
      : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  };
  const focusAverage = averageOf(rows.map((row) => row.focusValue));
  const rivalAverage = averageOf(rows.map((row) => row.compareValue));

  return (
    <section className="view-stack">
      <PageHeader
        copy={
          comparableRows.length > 0
            ? `${focusName} leads ${focusLed} of ${comparableRows.length} shared games on ${metricLabel.toLowerCase()}${
                tied > 0 ? `, with ${tied} level` : ""
              }.`
            : "Pick a focus player and a rival to read their shared games side by side."
        }
        eyebrow="Compare"
        meta={`${formatCount(rows.length)} shared games`}
        title={`${focusName} vs ${rivalName}`}
      />

      <DashboardPanel padding="normal">
        <form className="toolbar">
          <label className="field toolbar__grow">
            <span className="field__label">Focus player</span>
            <select
              aria-label="Focus Player"
              className="select"
              defaultValue={selectedFocusPlayerId}
              name="focusPlayerId"
            >
              {setup.focusPlayerOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field toolbar__grow">
            <span className="field__label">Rival</span>
            <select
              aria-label="Compare Player"
              className="select"
              defaultValue={selectedComparePlayerId}
              name="comparePlayerId"
            >
              {availableCompareOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn--primary" type="submit">
            Run compare
          </button>
        </form>
      </DashboardPanel>

      {rows.length > 0 ? (
        <>
          <div className="stat-grid">
            <MetricCard
              accent="var(--blue)"
              detail={`Average ${metricLabel.toLowerCase()} per shared game.`}
              label={`${focusName} average`}
              value={formatDecimal(focusAverage, 1)}
            />
            <MetricCard
              accent="var(--gold)"
              detail={`Average ${metricLabel.toLowerCase()} per shared game.`}
              label={`${rivalName} average`}
              value={formatDecimal(rivalAverage, 1)}
            />
            <MetricCard
              accent="var(--accent)"
              detail={`${focusLed} to ${rivalLed}${tied > 0 ? ` · ${tied} level` : ""}`}
              label="Games led"
              value={`${focusLed}–${rivalLed}`}
            />
            <MetricCard
              detail="Positive means the focus player was ahead."
              label="Average gap"
              value={formatSigned(
                focusAverage !== null && rivalAverage !== null
                  ? focusAverage - rivalAverage
                  : null,
                1,
              )}
            />
          </div>

          <DashboardPanel padding="normal">
            <div className="panel-head">
              <div className="panel-head__text">
                <p className="eyebrow" style={{ margin: 0 }}>
                  Game by game
                </p>
                <h2 className="panel-title">Shared games</h2>
              </div>
              <span className="panel-count">
                Measured on {metricLabel.toLowerCase()}
              </span>
            </div>

            <div className="table-scroll">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th className="col-text">Game</th>
                    <th>{focusName}</th>
                    <th>{rivalName}</th>
                    <th>Gap</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td className="col-text is-strong">
                        {row.label}
                        {row.createdAt ? (
                          <span
                            className="tile__meta"
                            suppressHydrationWarning
                            style={{ marginLeft: "0.5rem" }}
                          >
                            {formatShortDate(row.createdAt)}
                          </span>
                        ) : null}
                      </td>
                      <td>{formatCount(row.focusValue)}</td>
                      <td>{formatCount(row.compareValue)}</td>
                      <td
                        className={
                          row.delta === null
                            ? "is-muted"
                            : row.delta > 0
                              ? "is-good"
                              : row.delta < 0
                                ? "is-bad"
                                : "is-muted"
                        }
                      >
                        {row.delta === null ? MISSING : formatSigned(row.delta)}
                      </td>
                      <td>
                        {row.gameId ? (
                          <Link
                            className="btn"
                            href={`/summary/${encodeURIComponent(row.gameId)}`}
                          >
                            Open
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardPanel>
        </>
      ) : (
        <EmptyStatePanel
          copy={
            renderableDataset.emptyState?.subtitle ??
            "These two players have no finished games in common yet."
          }
          eyebrow="Compare"
          title={
            renderableDataset.emptyState?.title ?? "No shared games to compare"
          }
        />
      )}
    </section>
  );
}
