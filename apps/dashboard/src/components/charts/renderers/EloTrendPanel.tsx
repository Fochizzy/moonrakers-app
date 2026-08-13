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
import { SectionHeading } from "@/components/ui/SectionHeading";

import { asArray, asRecord, toNumber, toText } from "../chartUtils";
import { ChartLabelStrip } from "./ChartLabels";

function buildRows(data: Record<string, unknown>) {
  return asArray(data.data)
    .map((entry, index) => {
      const row = asRecord(entry);
      const elo = toNumber(row.elo ?? row.focusElo ?? row.value);
      const compareElo = toNumber(row.compareElo ?? row.opponentElo ?? row.rivalElo);

      return {
        label: toText(row.label ?? row.gameLabel ?? row.round, `Game ${index + 1}`),
        elo,
        compareElo,
      };
    })
    .filter((row) => row.elo !== null || row.compareElo !== null);
}

export function EloTrendPanel({
  payload,
}: {
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const rows = buildRows(payload.data);
  const hasCompare = rows.some((row) => row.compareElo !== null);

  if (!rows.length) {
    return (
      <EmptyStatePanel
        eyebrow="Elo Trend"
        title={payload.title ?? "No Elo rows returned"}
        copy="This Elo renderer expects rating rows with `elo` and optional `compareElo` values."
      />
    );
  }

  return (
    <div className="view-stack">
      <DashboardPanel tone="blue">
        <SectionHeading
          eyebrow="Elo Trend"
          title={payload.title ?? "Elo trend"}
          copy={payload.subtitle ?? "Rating movement across the selected game history."}
        />
      </DashboardPanel>

      <DashboardPanel tone="success">
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <ChartLabelStrip
            series={[
              { color: "var(--blue)", label: "Focus Elo" },
              ...(hasCompare ? [{ color: "var(--accent)", label: "Opponent Elo" }] : []),
            ]}
            xLabel="Game"
            yLabel="Elo Rating"
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
              <YAxis stroke="var(--sub)" width={72}>
                <Label
                  angle={-90}
                  fill="var(--sub)"
                  fontSize={12}
                  fontWeight={800}
                  position="insideLeft"
                  value="Elo Rating"
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
                dataKey="elo"
                name="Focus Elo"
                stroke="var(--blue)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--blue)" }}
                type="monotone"
              />
              {hasCompare ? (
                <Line
                  dataKey="compareElo"
                  name="Opponent Elo"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--accent)" }}
                  type="monotone"
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
