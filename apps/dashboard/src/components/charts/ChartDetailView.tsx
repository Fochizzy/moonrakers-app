import type { ChartDatasetPayload, ChartSetupPayload } from "@moonrakers/analytics-contract";
import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { ChartRenderer } from "./ChartRenderer";
import { getDashboardChartEntry } from "./chartCatalog";

function renderSelect({
  ariaLabel,
  defaultValue,
  name,
  options,
}: {
  ariaLabel: string;
  defaultValue: string | null | undefined;
  name: string;
  options: Array<{ key: string; label: string }>;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <label style={{ display: "grid", gap: "0.45rem" }}>
      <span className="section-eyebrow" style={{ margin: 0 }}>
        {ariaLabel}
      </span>
      <select
        aria-label={ariaLabel}
        defaultValue={defaultValue ?? options[0]?.key ?? ""}
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
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ChartDetailView({
  chartKey,
  dataset,
  setup,
}: {
  chartKey: string;
  dataset: ChartDatasetPayload;
  setup: ChartSetupPayload;
}) {
  const entry = getDashboardChartEntry(chartKey);

  return (
    <section className="view-stack">
      <SectionHeading
        eyebrow="Chart Detail"
        title={dataset.title ?? entry.title}
        copy={dataset.subtitle ?? entry.detailSubtitle}
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
        <form style={{ display: "grid", gap: "1rem" }}>
          <div className="metric-grid">
            {renderSelect({
              ariaLabel: "Focus Player",
              defaultValue: setup.defaults.focusPlayerId,
              name: "focusPlayerId",
              options: setup.focusPlayerOptions,
            })}
            {renderSelect({
              ariaLabel: "Compare Player",
              defaultValue: setup.defaults.comparePlayerId,
              name: "comparePlayerId",
              options: setup.comparePlayerOptions,
            })}
            {renderSelect({
              ariaLabel: "Metric",
              defaultValue: setup.defaults.metricKey,
              name: "metricKey",
              options: setup.metricOptions,
            })}
            {renderSelect({
              ariaLabel: "Line Mode",
              defaultValue: setup.defaults.lineMode,
              name: "lineMode",
              options: setup.lineModeOptions,
            })}
            {renderSelect({
              ariaLabel: "Opponent",
              defaultValue: setup.defaults.opponentId,
              name: "opponentId",
              options: setup.opponentOptions,
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
              }}
            >
              Update Chart
            </button>
          </div>
        </form>
      </DashboardPanel>

      {dataset.emptyState ? (
        <EmptyStatePanel
          eyebrow="Dataset"
          title={dataset.emptyState.title}
          copy={dataset.emptyState.subtitle ?? "The chart route is wired, but this dataset is currently empty."}
        />
      ) : (
        <ChartRenderer chartKey={chartKey} payload={dataset} />
      )}
    </section>
  );
}
