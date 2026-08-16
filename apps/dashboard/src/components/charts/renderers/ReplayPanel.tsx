import {
  CartesianGrid,
  Label,
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

function buildReplayRows(data: Record<string, unknown>) {
  return asArray(data.replay).map((entry, index) => {
    const row = asRecord(entry);

    return {
      label: toText(row.label ?? row.round ?? row.turn ?? row.step, `Step ${index + 1}`),
      value: toNumber(row.value ?? row.metricValue ?? row.total ?? row.delta),
    };
  });
}

export function ReplayPanel({
  payload,
}: {
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const rows = buildReplayRows(payload.data).filter((entry) => entry.value !== null);

  return (
    <div className="view-stack">
      <DashboardPanel tone="success">
        <SectionHeading
          eyebrow="Replay Family"
          title={payload.title ?? "Replay chart"}
          copy={
            payload.subtitle ??
            "Replay charts step through the sample over time, so the web renderer keeps a continuous timeline instead of a static summary."
          }
        />
      </DashboardPanel>

      {rows.length > 0 ? (
        <DashboardPanel tone="blue">
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <ChartLabelStrip
              series={[{ color: "var(--blue)", label: "Replay Value" }]}
              xLabel="Replay Step"
              yLabel="Value"
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
                    value="Replay Step"
                  />
                </XAxis>
                <YAxis stroke="var(--sub)" width={62}>
                  <Label
                    angle={-90}
                    fill="var(--sub)"
                    fontSize={12}
                    fontWeight={800}
                    position="insideLeft"
                    value="Value"
                  />
                </YAxis>
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid rgba(59, 130, 246, 0.24)",
                    background: "rgba(7, 12, 28, 0.94)",
                    color: "#fff",
                  }}
                />
                <Line
                  dataKey="value"
                  name="Replay Value"
                  stroke="var(--blue)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--gold)" }}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </div>
        </DashboardPanel>
      ) : (
        <EmptyStatePanel
          eyebrow="Replay Family"
          title="No replay timeline returned"
          copy="This renderer expects replay rows before it can draw the metric timeline."
        />
      )}
    </div>
  );
}
