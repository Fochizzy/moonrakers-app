"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { asArray, asRecord, toNumber, toText } from "../chartUtils";
import { ChartLabelStrip } from "./ChartLabels";

function buildRows(data: Record<string, unknown>) {
  const directRows = asArray(data.rows).map((entry, index) => {
    const row = asRecord(entry);
    return {
      axis: toText(row.label ?? row.metricLabel ?? row.title, `Trait ${index + 1}`),
      focus: toNumber(row.focusValue ?? row.focus ?? row.playerValue),
      compare: toNumber(row.compareValue ?? row.compare ?? row.rivalValue),
    };
  });

  if (directRows.length > 0) {
    return directRows.filter((row) => row.focus !== null || row.compare !== null);
  }

  const primary = asRecord(data.primary);
  const comparison = asRecord(data.comparison);
  const keys = Array.from(new Set([...Object.keys(primary), ...Object.keys(comparison)]));

  return keys
    .map((key) => ({
      axis: key.replace(/_/g, " "),
      focus: toNumber(primary[key]),
      compare: toNumber(comparison[key]),
    }))
    .filter((row) => row.focus !== null || row.compare !== null);
}

function resolveMaxValue(rows: Array<{ focus: number | null; compare: number | null }>) {
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [row.focus, row.compare]).filter((value): value is number => value !== null),
  );

  return maxValue <= 1 ? 1 : Math.ceil(maxValue);
}

export function RadarChartPanel({
  payload,
}: {
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const rows = buildRows(payload.data);
  const hasCompare = rows.some((row) => row.compare !== null);
  const maxValue = resolveMaxValue(rows);

  if (!rows.length) {
    return (
      <EmptyStatePanel
        eyebrow="Radar Profile"
        title={payload.title ?? "No radar rows returned"}
        copy="This radar renderer expects trait rows with focus values and optional comparison values."
      />
    );
  }

  return (
    <div className="view-stack">
      <DashboardPanel tone="accent">
        <SectionHeading
          eyebrow="Radar Profile"
          title={payload.title ?? "Radar chart"}
          copy={payload.subtitle ?? "Round trait profile across the selected player's tracked games."}
        />
      </DashboardPanel>

      <DashboardPanel tone="blue">
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <ChartLabelStrip
            series={[
              { color: "var(--blue)", label: "Focus" },
              ...(hasCompare ? [{ color: "var(--accent)", label: "Compare" }] : []),
            ]}
            xLabel="Trait Spokes"
            yLabel="Value Scale"
          />
        <div style={{ width: "100%", height: 430 }}>
          <ResponsiveContainer>
            <RadarChart data={rows} outerRadius="76%">
              <PolarGrid stroke="var(--grid)" />
              <PolarAngleAxis dataKey="axis" stroke="var(--sub)" />
              <PolarRadiusAxis
                angle={90}
                domain={[0, maxValue]}
                stroke="var(--sub)"
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "1rem",
                  border: "1px solid rgba(45, 212, 191, 0.24)",
                  background: "rgba(7, 12, 28, 0.94)",
                  color: "#fff",
                }}
              />
              <Radar
                dataKey="focus"
                fill="var(--blue)"
                fillOpacity={0.32}
                name="Focus"
                stroke="var(--blue)"
                strokeWidth={3}
              />
              {hasCompare ? (
                <Radar
                  dataKey="compare"
                  fill="var(--accent)"
                  fillOpacity={0.22}
                  name="Compare"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                />
              ) : null}
              {hasCompare ? <Legend /> : null}
            </RadarChart>
          </ResponsiveContainer>
        </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
