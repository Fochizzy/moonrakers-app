import {
  Bar,
  BarChart,
  CartesianGrid,
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
  const numericKeys = extractNumericKeys(rows).filter((key) => key !== "round");
  const primaryMetric = numericKeys[0];
  const secondaryMetric = numericKeys[1];

  if (!rows.length || !primaryMetric) {
    return (
      <EmptyStatePanel
        eyebrow="Chart Family"
        title={payload.title ?? "No renderable chart rows returned"}
        copy="This cartesian renderer expects `data.data[]` rows with at least one numeric metric."
      />
    );
  }

  const normalizedRows: Array<Record<string, string | number>> = rows.map((row) => ({
    ...row,
    [primaryMetric]: toNumber((row as Record<string, unknown>)[primaryMetric]) ?? 0,
    ...(secondaryMetric
      ? {
          [secondaryMetric]:
            toNumber((row as Record<string, unknown>)[secondaryMetric]) ?? 0,
        }
      : {}),
  })) as Array<Record<string, string | number>>;

  const isScatter = chartKey.includes("scatter");
  const isLine =
    chartKey.includes("line") ||
    chartKey.includes("bump") ||
    chartKey.includes("prestige");

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
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            {isScatter && secondaryMetric ? (
              <ScatterChart>
                <CartesianGrid stroke="var(--grid)" />
                <XAxis dataKey={primaryMetric} name={primaryMetric} stroke="var(--sub)" />
                <YAxis dataKey={secondaryMetric} name={secondaryMetric} stroke="var(--sub)" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid rgba(59, 130, 246, 0.24)",
                    background: "rgba(7, 12, 28, 0.94)",
                    color: "#fff",
                  }}
                />
                <Scatter data={normalizedRows} fill="var(--accent)" />
              </ScatterChart>
            ) : isLine ? (
              <LineChart data={normalizedRows}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--sub)" />
                <YAxis stroke="var(--sub)" />
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
                  stroke="var(--blue)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--gold)" }}
                  type="monotone"
                />
              </LineChart>
            ) : (
              <BarChart data={normalizedRows}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--sub)" />
                <YAxis stroke="var(--sub)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid rgba(168, 85, 247, 0.24)",
                    background: "rgba(7, 12, 28, 0.94)",
                    color: "#fff",
                  }}
                />
                <Bar dataKey={primaryMetric} fill="var(--blue)" radius={[10, 10, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </DashboardPanel>
    </div>
  );
}
