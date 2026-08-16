"use client";

import { useRef, useState } from "react";

import {
  DASHBOARD_CHART_SECTIONS,
  DASHBOARD_CHARTS,
  getDashboardChartEntry,
  getDashboardChartsForSection,
} from "@/components/charts/chartCatalog";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";

import { buildPreviewChartPayload, PREVIEW_SAMPLE_NOTE } from "./previewData";

export function ChartPreviewGallery() {
  const [selectedChartKey, setSelectedChartKey] = useState("radar");
  const previewRef = useRef<HTMLDivElement>(null);

  const selectedChart = getDashboardChartEntry(selectedChartKey);
  const payload = buildPreviewChartPayload(selectedChart.key);
  const position = DASHBOARD_CHARTS.findIndex(
    (chart) => chart.key === selectedChart.key,
  );
  const family = DASHBOARD_CHART_SECTIONS.find(
    (entry) => entry.key === selectedChart.section,
  );

  /**
   * The catalog runs below the fold, so picking a chart from the bottom of the
   * page would otherwise swap something the reader cannot see.
   */
  function selectChart(chartKey: string, scroll = true) {
    setSelectedChartKey(chartKey);

    if (scroll) {
      previewRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  }

  function step(delta: number) {
    const next =
      (position + delta + DASHBOARD_CHARTS.length) % DASHBOARD_CHARTS.length;
    selectChart(DASHBOARD_CHARTS[next]?.key ?? "radar", false);
  }

  return (
    <div className="view-stack">
      <div className="preview-chart-anchor" ref={previewRef}>
        <DashboardPanel padding="normal">
          <div className="preview-chart-head">
            <div className="preview-chart-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Live chart · {family?.title ?? "Chart"}
              </p>
              <h2 className="preview-chart-head__title">
                {selectedChart.title}
              </h2>
              <p className="panel-copy">{selectedChart.hook}</p>
            </div>

            <div className="preview-stepper">
              <button
                aria-label="Previous chart"
                className="preview-stepper__button"
                onClick={() => step(-1)}
                type="button"
              >
                ‹
              </button>
              <span className="preview-stepper__count">
                {position + 1} / {DASHBOARD_CHARTS.length}
              </span>
              <button
                aria-label="Next chart"
                className="preview-stepper__button"
                onClick={() => step(1)}
                type="button"
              >
                ›
              </button>
            </div>
          </div>

          {/* What the chart plots belongs above it — read after the picture it
              is only ever a caption for something already misread. */}
          <p className="preview-chart-meta">
            <span className="preview-chart-meta__label">Plots</span>
            {selectedChart.detailSubtitle}
          </p>

          {payload ? (
            <ChartRenderer chartKey={selectedChart.key} payload={payload} />
          ) : (
            <EmptyStatePanel
              copy="Sign in to render this one against your own games."
              eyebrow="Live preview"
              title="No sample data written for this chart yet"
            />
          )}

          <p className="preview-note">
            {PREVIEW_SAMPLE_NOTE} Step through them with ‹ and ›, or pick any
            one from the catalog below.
          </p>
        </DashboardPanel>
      </div>

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Catalog
            </p>
            <h2 className="panel-title">Every chart, by what you want to ask</h2>
            <p className="panel-copy">
              Pick any one to render it against the tracked games above.
            </p>
          </div>
          <span className="panel-count">
            {DASHBOARD_CHARTS.length} charts · {DASHBOARD_CHART_SECTIONS.length}{" "}
            families
          </span>
        </div>

        <div className="preview-picker">
          {DASHBOARD_CHART_SECTIONS.map((section) => (
            <section className="preview-picker__group" key={section.key}>
              <h3 className="preview-picker__label">{section.title}</h3>
              <p className="preview-picker__copy">{section.subtitle}</p>

              <div className="preview-picker__row">
                {getDashboardChartsForSection(section.key).map((chart) => (
                  <button
                    aria-label={`Preview the ${chart.title} chart`}
                    aria-pressed={chart.key === selectedChart.key}
                    className="preview-chip-button"
                    key={chart.key}
                    onClick={() => selectChart(chart.key)}
                    title={chart.hook}
                    type="button"
                  >
                    {chart.title}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}
