import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";

import { asArray, asRecord, toNumber, toText } from "../chartUtils";
import { formatChartValue } from "./ChartLabels";

type HeatmapCell = {
  column: string;
  playerId: string;
  playerName: string;
  value: number;
};

function buildCells(data: Record<string, unknown>): HeatmapCell[] {
  return asArray(data.data)
    .map((entry, index) => {
      const cell = asRecord(entry);
      const value = toNumber(cell.value ?? cell.metricValue ?? cell.intensity);

      if (value === null) {
        return null;
      }

      return {
        column: toText(cell.xLabel ?? cell.round ?? index + 1),
        playerId: toText(cell.playerId ?? cell.playerName, `player-${index}`),
        playerName: toText(cell.playerName ?? cell.playerId, "Player"),
        value,
      };
    })
    .filter((cell): cell is HeatmapCell => cell !== null);
}

/**
 * Cells used to wrap in reading order, so a player's run never lined up and the
 * grid could not be read across or down. Players become rows and games become
 * columns, which is the only arrangement where "hottest run" is visible.
 */
function buildMatrix(cells: HeatmapCell[]) {
  const columns: string[] = [];
  const rowOrder: string[] = [];
  const rowNames = new Map<string, string>();
  const values = new Map<string, number>();

  for (const cell of cells) {
    if (!columns.includes(cell.column)) {
      columns.push(cell.column);
    }

    if (!rowOrder.includes(cell.playerId)) {
      rowOrder.push(cell.playerId);
      rowNames.set(cell.playerId, cell.playerName);
    }

    values.set(`${cell.playerId}::${cell.column}`, cell.value);
  }

  return {
    columns,
    rows: rowOrder.map((playerId) => ({
      cells: columns.map((column) => ({
        column,
        value: values.get(`${playerId}::${column}`) ?? null,
      })),
      name: rowNames.get(playerId) ?? "Player",
      playerId,
    })),
  };
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
  const cells = buildCells(payload.data);
  const { columns, rows } = buildMatrix(cells);
  const maxValue = Math.max(...cells.map((cell) => cell.value), 1);
  const minValue = Math.min(...cells.map((cell) => cell.value), 0);
  const span = Math.max(maxValue - minValue, 1);

  if (cells.length === 0) {
    return (
      <EmptyStatePanel
        copy="No games in the selected sample carry this metric yet."
        eyebrow="Heatmap"
        title="No heatmap cells returned"
      />
    );
  }

  return (
    <div className="view-stack">
      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Heatmap
            </p>
            <h2 className="panel-title">{payload.title ?? "Metric intensity"}</h2>
            {payload.subtitle ? (
              <p className="panel-copy">{payload.subtitle}</p>
            ) : null}
          </div>
          <span className="panel-count">
            {rows.length} players × {columns.length} games · darker is higher
          </span>
        </div>

        <div className="table-scroll">
          <table className="data-table heatmap">
            <thead>
              <tr>
                <th className="col-text">Player</th>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId}>
                  <td className="col-text is-strong">{row.name}</td>
                  {row.cells.map((cell) => (
                    <td
                      key={`${row.playerId}-${cell.column}`}
                      style={
                        cell.value === null
                          ? undefined
                          : {
                              background: `rgba(168, 85, 247, ${(
                                0.08 +
                                ((cell.value - minValue) / span) * 0.62
                              ).toFixed(3)})`,
                            }
                      }
                    >
                      {cell.value === null ? "" : formatChartValue(cell.value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
    </div>
  );
}
