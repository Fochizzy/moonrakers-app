import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { asArray, asRecord, toNumber, toText } from "../chartUtils";

function buildCells(data: Record<string, unknown>) {
  return asArray(data.data).map((entry, index) => {
    const cell = asRecord(entry);
    return {
      key: toText(cell.id ?? `${cell.playerId ?? "player"}-${cell.round ?? index}`),
      label:
        toText(cell.label) ||
        `${toText(cell.playerName ?? cell.playerId, "Player")} • ${toText(cell.round ?? cell.xLabel ?? index + 1)}`,
      value: toNumber(cell.value ?? cell.metricValue ?? cell.intensity),
    };
  });
}

export function HeatmapPanel({
  payload,
}: {
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const cells = buildCells(payload.data).filter((entry) => entry.value !== null);
  const maxValue = Math.max(...cells.map((entry) => entry.value ?? 0), 1);

  return (
    <div className="view-stack">
      <DashboardPanel tone="accent">
        <SectionHeading
          eyebrow="Heatmap Family"
          title={payload.title ?? "Heatmap"}
          copy={
            payload.subtitle ??
            "Heatmaps read best as intensity blocks, so the web view keeps a square command-grid instead of flattening this family into plain text."
          }
        />
      </DashboardPanel>

      {cells.length > 0 ? (
        <DashboardPanel tone="warning">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {cells.slice(0, 24).map((cell) => {
              const intensity = Math.max(0.12, (cell.value ?? 0) / maxValue);
              return (
                <div
                  key={cell.key}
                  style={{
                    minHeight: "7rem",
                    padding: "0.85rem",
                    borderRadius: "1rem",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: `rgba(168, 85, 247, ${intensity})`,
                    display: "grid",
                    alignContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <p className="section-eyebrow" style={{ margin: 0 }}>
                    {cell.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "1.25rem",
                      fontWeight: 800,
                    }}
                  >
                    {cell.value}
                  </p>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      ) : (
        <EmptyStatePanel
          eyebrow="Heatmap Family"
          title="No heatmap cells returned"
          copy="This renderer expects metric intensity rows before it can paint the command-grid view."
        />
      )}
    </div>
  );
}
