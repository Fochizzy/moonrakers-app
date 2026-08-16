"use client";

import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";

import { asArray, asRecord, extractNumericKeys, toNumber, toText } from "../chartUtils";
import { ChartLabelStrip, formatMetricLabel } from "./ChartLabels";

function resolveMetricKey(data: Record<string, unknown>) {
  const preferredMetricKey = toText(data.metricKey).trim();
  if (preferredMetricKey) {
    return preferredMetricKey;
  }

  const numericKeys = extractNumericKeys([
    ...asArray(data.data),
    ...asArray(data.comparisonData),
  ]).filter((key) => !["round"].includes(key));

  return numericKeys[0] ?? null;
}

function readRowValue(row: Record<string, unknown>, metricKey: string | null) {
  if (metricKey && toNumber(row[metricKey]) !== null) {
    return toNumber(row[metricKey]);
  }

  return toNumber(row.value ?? row.metricValue ?? row.y);
}

function buildRows(data: Record<string, unknown>) {
  const primaryRows = asArray(data.data);
  const comparisonRows = asArray(data.comparisonData);
  const metricKey = resolveMetricKey(data);
  const totalRows = Math.max(primaryRows.length, comparisonRows.length);

  return Array.from({ length: totalRows }, (_, index) => {
    const primary = asRecord(primaryRows[index]);
    const comparison = asRecord(comparisonRows[index]);

    return {
      label: toText(
        primary.label ??
          comparison.label ??
          primary.xLabel ??
          comparison.xLabel ??
          primary.round ??
          comparison.round,
        `Point ${index + 1}`,
      ),
      focus: readRowValue(primary, metricKey),
      compare: readRowValue(comparison, metricKey),
    };
  }).filter((row) => row.focus !== null || row.compare !== null);
}

export function SparklineChartPanel({
  payload,
}: {
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const rows = buildRows(payload.data);
  const primaryLabel = toText(payload.data.primaryLabel, "Focus");
  const comparisonLabel = toText(payload.data.comparisonLabel, "Compare");
  const metricLabel = formatMetricLabel(resolveMetricKey(payload.data) ?? "Value");

  if (!rows.length) {
    return (
      <EmptyStatePanel
        eyebrow="Sparkline Family"
        title={payload.title ?? "No renderable sparkline rows returned"}
        copy="This metric has no values across the selected games yet."
      />
    );
  }

  return (
    <div className="view-stack">

      <DashboardPanel tone="success">
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <ChartLabelStrip
            family="Sparkline Family"
            series={[
              { color: "var(--blue)", label: primaryLabel },
              { color: "var(--accent)", label: comparisonLabel },
            ]}
            xLabel="Game"
            yLabel={metricLabel}
          />
        <div style={{ width: "100%", height: 390 }}>
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ bottom: 34, left: 10, right: 18, top: 16 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="label" height={54} stroke="var(--sub)">
                <Label
                  fill="var(--sub)"
                  fontSize={12}
                  fontWeight={800}
                  offset={-8}
                  position="insideBottom"
                  value="Game"
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
                  border: "1px solid rgba(45, 212, 191, 0.24)",
                  background: "rgba(7, 12, 28, 0.94)",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                dataKey="focus"
                name={primaryLabel}
                stroke="var(--blue)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--gold)" }}
                type="monotone"
                connectNulls
              />
              <Line
                dataKey="compare"
                name={comparisonLabel}
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--accent)" }}
                type="monotone"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
