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

function buildEdges(data: Record<string, unknown>) {
  const edges = [
    ...asArray(data.relationships),
    ...asArray(data.edges),
  ];

  return edges
    .map((entry, index) => {
      const edge = asRecord(entry);
      const weight = toNumber(edge.weight ?? edge.value ?? edge.assists ?? edge.count);

      return {
        key: toText(edge.id ?? edge.label, `edge-${index}`),
        label:
          toText(edge.label) ||
          `${toText(edge.from ?? edge.source, "Player")} -> ${toText(edge.to ?? edge.target, "Player")}`,
        weight,
      };
    })
    .filter((edge) => edge.weight !== null);
}

export function NetworkChartPanel({
  payload,
}: {
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const edges = buildEdges(payload.data);

  return (
    <div className="view-stack">
      <DashboardPanel tone="blue">
        <SectionHeading
          eyebrow="Network Family"
          title={payload.title ?? "Assist network"}
          copy={
            payload.subtitle ??
            "Relationship graphs need real players plus edge payloads, so the web renderer turns those weights into a visible command-board network summary."
          }
        />
      </DashboardPanel>

      {edges.length > 0 ? (
        <DashboardPanel tone="success">
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart data={edges.slice(0, 10)}>
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
                <Bar dataKey="weight" fill="var(--gold)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>
      ) : (
        <EmptyStatePanel
          eyebrow="Network Family"
          title="No relationship edges returned"
          copy="This renderer expects assist-network style player and edge data before it can draw the web summary graph."
        />
      )}
    </div>
  );
}
