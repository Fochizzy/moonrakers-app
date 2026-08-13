import type { ChartDatasetPayload, ChartSetupPayload } from "@moonrakers/analytics-contract";
import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  buildChartControls,
  buildRenderableChartDataset,
  chartDatasetHasRenderableData,
} from "@/lib/charts/chartFallback";
import {
  resolveChartPresentationSubtitle,
  resolveChartPresentationTitle,
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
  if (options.length === 0) {
    return null;
  }

  const normalizedDefaultValue =
    normalizeOptionalSearchParam(defaultValue, {
      emptyValues: emptyValueKeys,
    }) ?? "";

  return (
    <label style={{ display: "grid", gap: "0.45rem" }}>
      <span className="section-eyebrow" style={{ margin: 0 }}>
        {ariaLabel}
      </span>
      <select
        aria-label={ariaLabel}
        defaultValue={normalizedDefaultValue}
        name={name}
        style={{
          width: "100%",
          padding: "0.95rem 1rem",
          borderRadius: "1rem",
          border: "1px solid rgba(168, 85, 247, 0.28)",
          background: "rgba(7, 12, 28, 0.84)",
          color: "var(--text-strong)",
        }}
      >
        {options.map((option) => (
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
        ))}
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
  const activeControls = buildChartControls({
    dataset,
    setup,
    controls,
  });
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
      <SectionHeading
        eyebrow="Chart Detail"
        title={resolveChartPresentationTitle(renderableDataset.title, entry.title)}
        copy={resolveChartPresentationSubtitle(
          renderableDataset.subtitle,
          entry.detailSubtitle,
        )}
        action={
          <Link
            href="/charts"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.8rem 0.95rem",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "var(--text-strong)",
              fontWeight: 700,
            }}
          >
            Back to Charts
          </Link>
        }
      />

      <DashboardPanel tone="accent">
        <form
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div
            className="metric-grid"
            style={{ flex: "1 1 auto", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 280px))" }}
          >
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
          </div>

          <button
            type="submit"
            style={{
              padding: "0.9rem 1.1rem",
              borderRadius: "1rem",
              border: "1px solid rgba(59, 130, 246, 0.38)",
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.24) 0%, rgba(168, 85, 247, 0.22) 100%)",
              color: "var(--text-strong)",
              fontWeight: 700,
              flex: "0 0 auto",
            }}
          >
            Update Chart
          </button>
        </form>
      </DashboardPanel>

      {shouldShowEmptyState ? (
        <EmptyStatePanel
          eyebrow="Dataset"
          title={renderableDataset.emptyState?.title ?? "No chart data yet"}
          copy={
            renderableDataset.emptyState?.subtitle ??
            "The chart route is wired, but this dataset is currently empty."
          }
        />
      ) : (
        <ChartRenderer chartKey={chartKey} payload={renderableDataset} />
      )}
    </section>
  );
}
