import Link from "next/link";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";

import {
  DASHBOARD_CHART_SECTIONS,
  getDashboardChartsForSection,
} from "./chartCatalog";

export function ChartsIndexView({
  focusPlayerId,
}: {
  focusPlayerId?: string;
}) {
  const normalizedFocusPlayerId = focusPlayerId?.trim() || "";

  return (
    <section className="view-stack">
      <PageHeader
        copy="Choose a chart family by Moonrakers use case: personal reads, direct matchups, and full-table movement."
        eyebrow="Charts"
        title="Graph launch deck"
      />

      {DASHBOARD_CHART_SECTIONS.map((section) => {
        const charts = getDashboardChartsForSection(section.key);

        return (
          <DashboardPanel key={section.key} padding="normal">
            <SectionHeading
              copy={section.subtitle}
              eyebrow="Chart family"
              title={section.title}
            />
            <div className="card-grid">
              {charts.map((chart) => {
                const routeParams = new URLSearchParams();

                if (normalizedFocusPlayerId) {
                  routeParams.set("focusPlayerId", normalizedFocusPlayerId);
                }

                const routeHref =
                  routeParams.size > 0
                    ? `/charts/${encodeURIComponent(chart.key)}?${routeParams.toString()}`
                    : `/charts/${encodeURIComponent(chart.key)}`;

                return (
                  // The eyebrow used to print the raw catalog key, so readers
                  // saw "efficiency failure scatter" above the real title.
                  <Link className="tile" href={routeHref} key={chart.key}>
                    <span className="eyebrow">{section.title}</span>
                    <span className="tile__title">{chart.title}</span>
                    <span className="tile__copy">{chart.hook}</span>
                    <span className="tile__meta">{chart.detailSubtitle}</span>
                  </Link>
                );
              })}
            </div>
          </DashboardPanel>
        );
      })}
    </section>
  );
}
