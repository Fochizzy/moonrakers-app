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

import {
  asArray,
  asRecord,
  resolvePlayerFallbackColor,
  toNumber,
  toText,
} from "../chartUtils";
import { ChartLabelStrip, formatMetricLabel } from "./ChartLabels";

type LineMode = "raw" | "cumulative" | "average";

type ChartPlayer = {
  color?: string;
  id: string;
  name: string;
};

function normalizeLineMode(value: unknown): LineMode {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "cumulative") {
    return "cumulative";
  }

  if (normalized === "average") {
    return "average";
  }

  return "raw";
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => toText(entry).trim())
        .filter(Boolean)
    : [];
}

function resolveMetricKey(data: Record<string, unknown>) {
  return (
    toText(data.metricKey).trim() ||
    toText(data.statKey).trim() ||
    toText(data.activeMetricKey).trim() ||
    "score"
  );
}

function buildAvailablePlayers(data: Record<string, unknown>) {
  const rows = asArray(data.data);
  const players = new Map<string, ChartPlayer>();

  asArray(data.players).forEach((entry, index) => {
    const player = asRecord(entry);
    const playerId = toText(player.id).trim();
    if (!playerId) {
      return;
    }

    players.set(playerId, {
      id: playerId,
      name: toText(player.name, "Player"),
      color: resolvePlayerFallbackColor(player.color, index),
    });
  });

  rows.forEach((entry) => {
    const snapshot = asRecord(asRecord(entry).snapshot);
    Object.entries(snapshot).forEach(([playerId, rawPlayer]) => {
      const normalizedPlayerId = toText(playerId).trim();
      if (!normalizedPlayerId || players.has(normalizedPlayerId)) {
        return;
      }

      const player = asRecord(rawPlayer);
      players.set(normalizedPlayerId, {
        id: normalizedPlayerId,
        name: toText(player.playerName ?? player.label ?? player.name, "Player"),
        color: resolvePlayerFallbackColor(player.color, players.size),
      });
    });
  });

  return [...players.values()];
}

function filterPlayers(data: Record<string, unknown>, availablePlayers: ChartPlayer[]) {
  const selectedIds = toStringArray(data.selectedPlayerIds);
  const scopedIds = toStringArray(data.scopedPlayerIds);
  const allowedIds = selectedIds.length > 0 ? selectedIds : scopedIds;

  if (allowedIds.length === 0) {
    return availablePlayers;
  }

  const allowedSet = new Set(allowedIds);
  const filteredPlayers = availablePlayers.filter((player) => allowedSet.has(player.id));
  return filteredPlayers.length > 0 ? filteredPlayers : availablePlayers;
}

function applyLineMode(values: number[], mode: LineMode) {
  if (mode === "raw") {
    return values;
  }

  let runningTotal = 0;
  return values.map((value, index) => {
    runningTotal += value;
    return mode === "cumulative" ? runningTotal : runningTotal / (index + 1);
  });
}

function buildRows(data: Record<string, unknown>, metricKey: string, mode: LineMode) {
  const rows = asArray(data.data);
  const visiblePlayers = filterPlayers(data, buildAvailablePlayers(data));

  if (rows.length === 0 || visiblePlayers.length === 0) {
    return { rows: [], visiblePlayers };
  }

  const valuesByPlayer = new Map<string, number[]>(
    visiblePlayers.map((player) => [
      player.id,
      rows.map((entry) => {
        const snapshot = asRecord(asRecord(entry).snapshot);
        return toNumber(asRecord(snapshot[player.id])[metricKey]) ?? 0;
      }),
    ]),
  );

  const normalizedValuesByPlayer = new Map<string, number[]>(
    visiblePlayers.map((player) => [
      player.id,
      applyLineMode(valuesByPlayer.get(player.id) ?? [], mode),
    ]),
  );

  const normalizedRows = rows.map((entry, index) => {
    const row = asRecord(entry);

    return visiblePlayers.reduce<Record<string, string | number>>(
      (nextRow, player) => ({
        ...nextRow,
        [player.id]: normalizedValuesByPlayer.get(player.id)?.[index] ?? 0,
      }),
      {
        label: toText(row.label ?? row.xLabel ?? row.round, `Game ${index + 1}`),
      },
    );
  });

  const hasRenderableData = normalizedRows.some((row) =>
    visiblePlayers.some((player) => typeof row[player.id] === "number"),
  );

  return {
    rows: hasRenderableData ? normalizedRows : [],
    visiblePlayers,
  };
}

function formatModeLabel(mode: LineMode) {
  switch (mode) {
    case "cumulative":
      return "Cumulative";
    case "average":
      return "Average";
    case "raw":
    default:
      return "Raw";
  }
}

export function LineHistoryPanel({
  payload,
}: {
  payload: {
    data: Record<string, unknown>;
    subtitle?: string;
    title?: string;
  };
}) {
  const metricKey = resolveMetricKey(payload.data);
  const lineMode = normalizeLineMode(payload.data.mode);
  const { rows, visiblePlayers } = buildRows(payload.data, metricKey, lineMode);
  const metricLabel = `${formatModeLabel(lineMode)} ${formatMetricLabel(metricKey)}`;

  if (!rows.length || visiblePlayers.length === 0) {
    return (
      <EmptyStatePanel
        eyebrow="Line History"
        title={payload.title ?? "No renderable line history returned"}
        copy="This line-history renderer expects per-game snapshot rows plus visible players before it can draw the selected metric."
      />
    );
  }

  return (
    <div className="view-stack">
      <DashboardPanel tone="blue">
        <SectionHeading
          eyebrow="Line History"
          title={payload.title ?? "Line chart"}
          copy={
            payload.subtitle ??
            `Track ${formatModeLabel(lineMode).toLowerCase()} ${metricKey} movement across the selected game history.`
          }
        />
      </DashboardPanel>

      <DashboardPanel tone="success">
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <ChartLabelStrip
            series={visiblePlayers.map((player) => ({
              color: player.color,
              label: player.name,
            }))}
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
              <YAxis stroke="var(--sub)" width={72}>
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
              {visiblePlayers.map((player) => (
                <Line
                  key={player.id}
                  dataKey={player.id}
                  name={player.name}
                  stroke={player.color}
                  strokeWidth={player.id === visiblePlayers[0]?.id ? 3 : 2.5}
                  dot={{ r: 3, fill: player.color }}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
