import type { ChartDatasetPayload, ChartSetupPayload } from "@moonrakers/analytics-contract";
import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  buildChartControls,
  buildRenderableChartDataset,
  chartDatasetHasRenderableData,
} from "@/lib/charts/chartFallback";
import {
  resolveChartPresentationSubtitle,
  resolveChartPresentationTitle,
  stripPlaceholderChartPresentation,
} from "@/lib/charts/presentation";
import { normalizeOptionalSearchParam } from "@/lib/readSearchParam";

import { ChartRenderer } from "./ChartRenderer";
import { getDashboardChartEntry } from "./chartCatalog";

function renderSelect({
  ariaLabel,
  defaultValue,
  emptyValueKeys = [],
  name,
  options,
}: {
  ariaLabel: string;
  defaultValue: string | null | undefined;
  emptyValueKeys?: string[];
  name: string;
  options: Array<{ key: string; label: string }>;
}) {
  const normalizedDefaultValue =
    normalizeOptionalSearchParam(defaultValue, {
      emptyValues: emptyValueKeys,
    }) ?? "";

  // A control that vanishes when its option list is empty makes the form look
  // different from one chart to the next for no stated reason.
  const isEmpty = options.length === 0;

  return (
    <label className="field toolbar__grow" key={name}>
      <span className="field__label">{ariaLabel}</span>
      <select
        aria-label={ariaLabel}
        className="select"
        defaultValue={normalizedDefaultValue}
        disabled={isEmpty}
        name={name}
      >
        {isEmpty ? (
          <option value="">Not available for this chart</option>
        ) : (
          options.map((option) => (
            <option
              key={option.key}
              value={
                normalizeOptionalSearchParam(option.key, {
                  emptyValues: emptyValueKeys,
                }) ?? ""
              }
            >
              {option.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

export function ChartDetailView({
  chartKey,
  controls,
  dataset,
  setup,
}: {
  chartKey: string;
  controls?: Partial<ChartSetupPayload["defaults"]>;
  dataset: ChartDatasetPayload;
  setup: ChartSetupPayload;
}) {
  const entry = getDashboardChartEntry(chartKey);
  const activeControls = buildChartControls({ dataset, setup, controls });
  const renderableDataset = buildRenderableChartDataset({
    chartKey,
    dataset,
    controls: activeControls,
  });
  const shouldShowEmptyState =
    !chartDatasetHasRenderableData(renderableDataset) &&
    Boolean(renderableDataset.emptyState);

  return (
    <section className="view-stack">
      <PageHeader
        actions={
          <Link className="btn" href="/charts">
            Back to charts
          </Link>
        }
        copy={resolveChartPresentationSubtitle(
          renderableDataset.subtitle,
          entry.detailSubtitle,
        )}
        eyebrow="Chart"
        title={resolveChartPresentationTitle(renderableDataset.title, entry.title)}
      />

      <DashboardPanel padding="normal">
        <form className="toolbar">
          {renderSelect({
            ariaLabel: "Focus Player",
            defaultValue: activeControls.focusPlayerId,
            name: "focusPlayerId",
            options: setup.focusPlayerOptions,
          })}
          {renderSelect({
            ariaLabel: "Compare Player",
            defaultValue: activeControls.comparePlayerId,
            name: "comparePlayerId",
            options: setup.comparePlayerOptions,
          })}
          {renderSelect({
            ariaLabel: "Metric",
            defaultValue: activeControls.metricKey,
            name: "metricKey",
            options: setup.metricOptions,
          })}
          {renderSelect({
            ariaLabel: "Line Mode",
            defaultValue: activeControls.lineMode,
            name: "lineMode",
            options: setup.lineModeOptions,
          })}
          {renderSelect({
            ariaLabel: "Opponent",
            defaultValue: activeControls.opponentId,
            emptyValueKeys: ["none"],
            name: "opponentId",
            options: setup.opponentOptions,
          })}

          <button className="btn btn--primary" type="submit">
            Update chart
          </button>
        </form>
      </DashboardPanel>

      {shouldShowEmptyState ? (
        <EmptyStatePanel
          copy={
            renderableDataset.emptyState?.subtitle ??
            "There are no finished games matching these filters yet."
          }
          eyebrow="Dataset"
          title={renderableDataset.emptyState?.title ?? "No chart data yet"}
        />
      ) : (
        <ChartRenderer
          chartKey={chartKey}
          payload={stripPlaceholderChartPresentation(renderableDataset)}
        />
      )}
    </section>
  );
}
