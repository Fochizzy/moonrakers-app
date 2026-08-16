import type {
  ChartDatasetPayload,
  ChartSetupPayload,
} from "@moonrakers/analytics-contract";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  buildChartControls,
  buildRenderableChartDataset,
} from "@/lib/charts/chartFallback";
import {
  resolveChartPresentationSubtitle,
  resolveChartPresentationTitle,
} from "@/lib/charts/presentation";

type CompareViewProps = {
  controls?: Partial<ChartSetupPayload["defaults"]>;
  dataset: ChartDatasetPayload;
  setup: {
    comparePlayerOptions: ChartSetupPayload["comparePlayerOptions"];
    defaults?: Partial<ChartSetupPayload["defaults"]>;
    focusPlayerOptions: ChartSetupPayload["focusPlayerOptions"];
  };
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    : [];
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}

function extractCompareRows(data: Record<string, unknown>) {
  return asArray(data.rows).map((entry, index) => {
    const row = asRecord(entry);

    return {
      key: toText(row.key ?? row.metricKey ?? row.label, `row-${index}`),
      label: toText(row.label ?? row.metricLabel ?? row.title, `Metric ${index + 1}`),
      focusValue: toText(row.focusValue ?? row.focus ?? row.playerValue, "No data"),
      compareValue: toText(row.compareValue ?? row.compare ?? row.rivalValue, "No data"),
      deltaValue: toText(row.delta ?? row.impact ?? row.value, "No delta"),
    };
  });
}

export function CompareView({ controls, dataset, setup }: CompareViewProps) {
  const activeControls = buildChartControls({
    dataset,
    setup,
    controls,
  });
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
    activeControls.comparePlayerId && activeControls.comparePlayerId !== selectedFocusPlayerId
      ? activeControls.comparePlayerId
      : availableCompareOptions[0]?.key ?? "";

  return (
    <section className="view-stack">
      <SectionHeading
        eyebrow="Compare"
        title={resolveChartPresentationTitle(renderableDataset.title, "Compare players")}
        copy={resolveChartPresentationSubtitle(
          renderableDataset.subtitle,
          "Pick a focus player and rival, then read the current side-by-side dataset through the same Moonrakers analytics contract used on mobile.",
        )}
      />

      <DashboardPanel tone="blue">
        <form
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          <div
            className="metric-grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 280px))" }}
          >
            <label style={{ display: "grid", gap: "0.45rem" }}>
              <span className="section-eyebrow" style={{ margin: 0 }}>
                Focus Player
              </span>
              <select
                aria-label="Focus Player"
                defaultValue={selectedFocusPlayerId}
                name="focusPlayerId"
                style={{
                  width: "100%",
                  padding: "0.95rem 1rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(96, 165, 250, 0.34)",
                  background: "rgba(7, 12, 28, 0.84)",
                  color: "var(--text-strong)",
                }}
              >
                {setup.focusPlayerOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.45rem" }}>
              <span className="section-eyebrow" style={{ margin: 0 }}>
                Compare Player
              </span>
              <select
                aria-label="Compare Player"
                defaultValue={selectedComparePlayerId}
                name="comparePlayerId"
                style={{
                  width: "100%",
                  padding: "0.95rem 1rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(168, 85, 247, 0.34)",
                  background: "rgba(7, 12, 28, 0.84)",
                  color: "var(--text-strong)",
                }}
              >
                {availableCompareOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--sub)",
                fontSize: "0.96rem",
                lineHeight: 1.6,
              }}
            >
              Route-driven compare keeps the web dashboard shareable while still
              letting you rerun the matchup from the command rail.
            </p>
            <button
              style={{
                padding: "0.9rem 1.1rem",
                borderRadius: "1rem",
                border: "1px solid rgba(59, 130, 246, 0.38)",
                background:
                  "linear-gradient(135deg, rgba(59, 130, 246, 0.24) 0%, rgba(168, 85, 247, 0.22) 100%)",
                color: "var(--text-strong)",
                fontWeight: 700,
              }}
              type="submit"
            >
              Run Compare
            </button>
          </div>
        </form>
      </DashboardPanel>

      {rows.length > 0 ? (
        <div className="view-stack">
          <SectionHeading
            eyebrow="Tactical Intel"
            title="Current side-by-side read"
            copy="Blue-framed controls set the compare lane, while purple deltas keep the headline swing visible."
          />
          <div className="metric-grid">
            {rows.map((row) => (
              <DashboardPanel
                key={row.key}
                as="article"
                tone="accent"
                style={{ display: "grid", gap: "0.75rem" }}
              >
                <p className="section-eyebrow" style={{ margin: 0 }}>
                  {row.label}
                </p>
                <div style={{ display: "grid", gap: "0.55rem" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  >
                    Focus: <span style={{ color: "var(--blue)" }}>{row.focusValue}</span>
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  >
                    Rival: <span style={{ color: "var(--gold)" }}>{row.compareValue}</span>
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--accent)",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                    }}
                  >
                    Delta: {row.deltaValue}
                  </p>
                </div>
              </DashboardPanel>
            ))}
          </div>
        </div>
      ) : (
        <EmptyStatePanel
          eyebrow="Compare ready"
          title={renderableDataset.emptyState?.title ?? "No compare rows returned yet"}
          copy={
            renderableDataset.emptyState?.subtitle ??
            "The selectors are wired up and waiting for a richer compare dataset from the analytics contract."
          }
        />
      )}
    </section>
  );
}
