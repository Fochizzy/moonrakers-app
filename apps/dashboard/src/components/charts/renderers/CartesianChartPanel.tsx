import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";

import {
  asArray,
  asRecord,
  extractNumericKeys,
  toNumber,
  toText,
} from "../chartUtils";
import { ChartLabelStrip, formatChartValue, formatMetricLabel } from "./ChartLabels";

function buildRows(data: Record<string, unknown>) {
  return asArray(data.data).map((entry, index) => {
    const row = asRecord(entry);
    return {
      label: toText(
        row.label ?? row.gameLabel ?? row.playerName ?? row.name ?? row.round,
        `Row ${index + 1}`,
      ),
      ...row,
    };
  });
}

function resolveScatterMetricKeys(chartKey: string, numericKeys: string[]) {
  if (chartKey === "efficiency_failure_scatter") {
    const xMetric =
      numericKeys.find((key) => key === "failures") ??
      numericKeys[1] ??
      numericKeys[0];
    const yMetric =
      numericKeys.find((key) => key === "efficiency") ??
      numericKeys.find((key) => key !== xMetric) ??
      numericKeys[0];

    return { xMetric, yMetric };
  }

  return {
    xMetric: numericKeys[0],
    yMetric: numericKeys[1] ?? numericKeys[0],
  };
}

export function CartesianChartPanel({
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
  const numericKeys = extractNumericKeys(rows).filter(
    (key) => key !== "label" && key !== "round",
  );
  const primaryMetric = numericKeys[0];
  const secondaryMetric = numericKeys[1];
  const isScatter = chartKey.includes("scatter");
  const scatterMetrics = isScatter
    ? resolveScatterMetricKeys(chartKey, numericKeys)
    : null;

  if (!rows.length || numericKeys.length === 0 || !primaryMetric) {
    return (
      <EmptyStatePanel
        eyebrow="Chart Family"
        title={payload.title ?? "No renderable chart rows returned"}
        copy="This cartesian renderer expects `data.data[]` rows with at least one numeric metric."
      />
    );
  }

  const normalizedRows: Array<Record<string, string | number>> = rows.map((row) => {
    const normalizedRow = {
      ...row,
    } as Record<string, string | number>;

    numericKeys.forEach((metricKey) => {
      normalizedRow[metricKey] =
        toNumber((row as Record<string, unknown>)[metricKey]) ?? 0;
    });

    return normalizedRow;
  });

  const isLine =
    chartKey.includes("line") ||
    chartKey.includes("bump") ||
    chartKey.includes("prestige");
  const primaryMetricLabel = formatMetricLabel(primaryMetric);
  const secondaryMetricLabel = secondaryMetric
    ? formatMetricLabel(secondaryMetric)
    : "Value";
  const scatterXAxisLabel = scatterMetrics
    ? formatMetricLabel(scatterMetrics.xMetric)
    : primaryMetricLabel;
  const scatterYAxisLabel = scatterMetrics
    ? formatMetricLabel(scatterMetrics.yMetric)
    : secondaryMetricLabel;
  const xLabel = isScatter ? scatterXAxisLabel : "Game or Row";
  const yLabel = isScatter ? scatterYAxisLabel : primaryMetricLabel;

  return (
    <div className="view-stack">
      <DashboardPanel tone="blue">
        <SectionHeading
          eyebrow="Cartesian Family"
          title={payload.title ?? "Chart detail"}
          copy={
            payload.subtitle ??
            "The web chart detail route uses the published dataset rows directly, with tone-aware axes and graph colors that match the Moonrakers analytics language."
          }
        />
      </DashboardPanel>

      <DashboardPanel tone="success">
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <ChartLabelStrip
            series={[{ color: isScatter ? "var(--accent)" : "var(--blue)", label: yLabel }]}
            xLabel={xLabel}
            yLabel={yLabel}
          />
        <div style={{ width: "100%", height: 390 }}>
          <ResponsiveContainer>
            {isScatter && secondaryMetric ? (
              <ScatterChart margin={{ bottom: 34, left: 10, right: 18, top: 16 }}>
                <CartesianGrid stroke="var(--grid)" />
                <XAxis
                  dataKey={scatterMetrics?.xMetric}
                  domain={["auto", "auto"]}
                  height={54}
                  name={scatterXAxisLabel}
                  stroke="var(--sub)"
                  tickFormatter={formatChartValue}
                  type="number"
                >
                  <Label
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    offset={-8}
                    position="insideBottom"
                    value={scatterXAxisLabel}
                  />
                </XAxis>
                <YAxis
                  dataKey={scatterMetrics?.yMetric}
                  domain={["auto", "auto"]}
                  name={scatterYAxisLabel}
                  stroke="var(--sub)"
                  tickFormatter={formatChartValue}
                  type="number"
                  width={72}
                >
                  <Label
                    angle={-90}
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    position="insideLeft"
                    value={scatterYAxisLabel}
                  />
                </YAxis>
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid rgba(59, 130, 246, 0.24)",
                    background: "rgba(7, 12, 28, 0.94)",
                    color: "#fff",
                  }}
                />
                <Scatter
                  data={normalizedRows}
                  fill="var(--accent)"
                  name={scatterYAxisLabel}
                />
              </ScatterChart>
            ) : isLine ? (
              <LineChart data={normalizedRows} margin={{ bottom: 34, left: 10, right: 18, top: 16 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" height={54} stroke="var(--sub)">
                  <Label
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    offset={-8}
                    position="insideBottom"
                    value="Game or Row"
                  />
                </XAxis>
                <YAxis stroke="var(--sub)" width={72}>
                  <Label
                    angle={-90}
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    position="insideLeft"
                    value={primaryMetricLabel}
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
                <Line
                  dataKey={primaryMetric}
                  name={primaryMetricLabel}
                  stroke="var(--blue)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--gold)" }}
                  type="monotone"
                />
              </LineChart>
            ) : (
              <BarChart data={normalizedRows} margin={{ bottom: 34, left: 10, right: 18, top: 28 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" height={54} stroke="var(--sub)">
                  <Label
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    offset={-8}
                    position="insideBottom"
                    value="Game or Row"
                  />
                </XAxis>
                <YAxis stroke="var(--sub)" width={72}>
                  <Label
                    angle={-90}
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    position="insideLeft"
                    value={primaryMetricLabel}
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
                <Bar dataKey={primaryMetric} fill="var(--blue)" name={primaryMetricLabel} radius={[10, 10, 0, 0]}>
                  <LabelList
                    dataKey={primaryMetric}
                    fill="rgba(248,250,252,0.92)"
                    fontSize={12}
                    fontWeight={800}
                    formatter={formatChartValue}
                    position="top"
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
