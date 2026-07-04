import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { asArray, asRecord, toNumber, toText } from "../chartUtils";

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

  return (
    <div className="view-stack">
      <DashboardPanel tone="accent">
        <SectionHeading
          eyebrow="Comparison Family"
          title={payload.title ?? "Comparison chart"}
          copy={
            payload.subtitle ??
            `This ${chartKey.replace(/_/g, " ")} view keeps the focus-versus-rival framing visible on web.`
          }
        />
      </DashboardPanel>

      {rows.length > 0 ? (
        <DashboardPanel tone="blue">
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart data={rows}>
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
                <Bar dataKey="focus" fill="var(--blue)" radius={[10, 10, 0, 0]} />
                <Bar dataKey="compare" fill="var(--accent)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
