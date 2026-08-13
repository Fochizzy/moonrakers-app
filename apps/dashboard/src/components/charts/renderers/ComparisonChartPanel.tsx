import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getMetricOrFallback } from "../../../../../../utils/metricMap";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { asArray, asRecord, toNumber, toText } from "../chartUtils";
import { ChartLabelStrip, formatChartValue } from "./ChartLabels";

function buildRows(data: Record<string, unknown>) {
  const directRows = asArray(data.rows).map((entry, index) => {
    const row = asRecord(entry);
    return {
      label: toText(row.label ?? row.metricLabel ?? row.title, `Metric ${index + 1}`),
      focus: toNumber(row.focusValue ?? row.focus ?? row.playerValue),
      compare: toNumber(row.compareValue ?? row.compare ?? row.rivalValue),
    };
  });

  if (directRows.length > 0) {
    return directRows;
  }

  const primary = asRecord(data.primary);
  const comparison = asRecord(data.comparison);
  const keys = Array.from(
    new Set([
      ...Object.keys(primary),
      ...Object.keys(comparison),
    ]),
  );

  return keys
    .map((key) => ({
      label: key.replace(/_/g, " "),
      focus: toNumber(primary[key]),
      compare: toNumber(comparison[key]),
    }))
    .filter((entry) => entry.focus !== null || entry.compare !== null);
}

export function ComparisonChartPanel({
  chartKey,
  payload,
}: {
  chartKey: string;
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const rows = buildRows(payload.data);
  const focusLabel = toText(payload.data.primaryLabel, "Focus");
  const compareLabel = toText(payload.data.comparisonLabel, "Compare");
  const metricKey = toText(
    payload.data.activeMetricKey ?? payload.data.metricKey ?? payload.data.statKey,
  );
  const metricLabel = metricKey ? getMetricOrFallback(metricKey).label : "Value";
  const xLabel = "Shared Game";

  return (
    <div className="view-stack">
      <DashboardPanel tone="accent">
        <SectionHeading
          eyebrow="Comparison Family"
          title={payload.title ?? "Comparison chart"}
          copy={
            payload.subtitle ??
            `This ${chartKey.replace(/_/g, " ")} view tracks ${metricLabel.toLowerCase()} across the shared games for the selected matchup.`
          }
        />
      </DashboardPanel>

      {rows.length > 0 ? (
        <DashboardPanel tone="blue">
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <ChartLabelStrip
              series={[
                { color: "var(--blue)", label: focusLabel },
                { color: "var(--accent)", label: compareLabel },
              ]}
              xLabel={xLabel}
              yLabel={metricLabel}
            />
          <div style={{ width: "100%", height: 390 }}>
            <ResponsiveContainer>
              <BarChart data={rows} margin={{ bottom: 34, left: 10, right: 14, top: 28 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" height={54} stroke="var(--sub)">
                  <Label
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    offset={-8}
                    position="insideBottom"
                    value={xLabel}
                  />
                </XAxis>
                <YAxis stroke="var(--sub)" width={62}>
                  <Label
                    angle={-90}
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    position="insideLeft"
                    value={metricLabel}
                  />
                </YAxis>
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid rgba(168, 85, 247, 0.24)",
                    background: "rgba(7, 12, 28, 0.94)",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Bar dataKey="focus" fill="var(--blue)" name={focusLabel} radius={[10, 10, 0, 0]}>
                  <LabelList
                    dataKey="focus"
                    fill="rgba(248,250,252,0.92)"
                    fontSize={12}
                    fontWeight={800}
                    formatter={formatChartValue}
                    position="top"
                  />
                </Bar>
                <Bar dataKey="compare" fill="var(--accent)" name={compareLabel} radius={[10, 10, 0, 0]}>
                  <LabelList
                    dataKey="compare"
                    fill="rgba(248,250,252,0.92)"
                    fontSize={12}
                    fontWeight={800}
                    formatter={formatChartValue}
                    position="top"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        </DashboardPanel>
      ) : (
        <EmptyStatePanel
          eyebrow="Comparison Family"
          title="No comparison rows returned"
          copy="This chart family is wired for compare, radar, head-to-head, and rivalry payloads once the dataset includes comparable rows."
        />
      )}
    </div>
  );
}
