import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";

import {
  DASHBOARD_CHART_SECTIONS,
  getDashboardChartsForSection,
} from "./chartCatalog";

export function ChartsIndexView() {
  return (
    <section className="view-stack">
      <SectionHeading
        eyebrow="Charts"
        title="Graph launch deck"
        copy="Choose a chart family by Moonrakers use case: personal reads, direct matchups, and full-table movement."
      />

      {DASHBOARD_CHART_SECTIONS.map((section) => {
        const charts = getDashboardChartsForSection(section.key);

        return (
          <div key={section.key} className="view-stack">
            <SectionHeading
              eyebrow={section.title}
              title={section.title}
              copy={section.subtitle}
            />
            <div className="metric-grid">
              {charts.map((chart) => (
                <DashboardPanel
                  key={chart.key}
                  as="article"
                  tone={section.key === "matchup" ? "accent" : "blue"}
                  style={{ display: "grid", gap: "0.7rem" }}
                >
                  <p className="section-eyebrow" style={{ margin: 0 }}>
                    {chart.key.replace(/_/g, " ")}
                  </p>
                  <h3
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "1.2rem",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {chart.title}
                  </h3>
                  <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.65 }}>
                    {chart.hook}
                  </p>
                  <Link
                    href={`/charts/${encodeURIComponent(chart.key)}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.85rem 1rem",
                      borderRadius: "1rem",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      background: "rgba(255, 255, 255, 0.04)",
                      color: "var(--text-strong)",
                      fontWeight: 700,
                    }}
                  >
                    Open {chart.title}
                  </Link>
                </DashboardPanel>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
