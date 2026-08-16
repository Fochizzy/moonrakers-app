import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";

import {
  asArray,
  asRecord,
  resolvePlayerFallbackColor,
  toNumber,
  toText,
} from "../chartUtils";
import { ChartLabelStrip } from "./ChartLabels";

type NetworkPlayer = {
  color: string;
  id: string;
  name: string;
};

type NetworkEdge = {
  detail: string | null;
  from: string;
  id: string;
  label: string;
  to: string;
  weight: number;
};

const NODE_RADIUS = 28;
const SVG_WIDTH = 880;
const SVG_HEIGHT = 420;
/** How far an edge bows off the straight line between two nodes. */
const EDGE_BOW = 26;

function buildPlayerDirectory(data: Record<string, unknown>) {
  const directory = new Map<string, NetworkPlayer>();

  [...asArray(data.players), ...asArray(data.nodes)].forEach((entry, index) => {
    const player = asRecord(entry);
    const id = toText(player.id).trim();
    if (!id) {
      return;
    }

    directory.set(id, {
      id,
      name: toText(
        player.name ?? player.playerName ?? player.label ?? player.displayName,
        "Player",
      ),
      color: resolvePlayerFallbackColor(player.color, index),
    });
  });

  return directory;
}

function readEdge(
  entry: Record<string, unknown>,
  index: number,
  playerDirectory?: Map<string, NetworkPlayer>,
): NetworkEdge | null {
  // The published assist graph names its endpoints `fromId`/`toId`; reading
  // only `from`/`to` dropped every server edge and left the chart empty even
  // though the same rows render fine on Insights.
  const from = toText(
    entry.from ?? entry.fromId ?? entry.source ?? entry.sourceId,
  ).trim();
  const to = toText(
    entry.to ?? entry.toId ?? entry.target ?? entry.targetId,
  ).trim();
  const weight = toNumber(
    entry.weight ??
      entry.value ??
      entry.assists ??
      entry.count ??
      entry.assistCount ??
      entry.assistPrestige,
  );

  if (!from || !to || weight === null || weight <= 0) {
    return null;
  }

  const fromLabel = playerDirectory?.get(from)?.name ?? from;
  const toLabel = playerDirectory?.get(to)?.name ?? to;
  const assistCount = toNumber(entry.assistCount ?? entry.timesAssisted);
  const assistPrestige = toNumber(entry.assistPrestige ?? entry.totalPrestige);

  return {
    id: toText(entry.id, `${from}-${to}-${index}`),
    from,
    to,
    // `labelText` is deliberately not read: it arrives half-formatted
    // ("1.1##/game"). A written `label` still wins over the composed one.
    label: toText(entry.label) || `${fromLabel} → ${toLabel}`,
    detail:
      assistCount !== null && assistPrestige !== null
        ? `${assistCount} assists · ${assistPrestige} prestige`
        : null,
    weight,
  };
}

function buildEdges(data: Record<string, unknown>) {
  const playerDirectory = buildPlayerDirectory(data);
  const relationshipEntries = [
    ...asArray(data.relationships),
    ...asArray(data.edges),
    ...asArray(data.links),
  ]
    .map((entry, index) => readEdge(asRecord(entry), index, playerDirectory))
    .filter((edge): edge is NetworkEdge => edge !== null);

  if (relationshipEntries.length > 0) {
    return relationshipEntries;
  }

  const relationships = asRecord(data.relationships);
  return Object.entries(relationships).flatMap(([from, nested], fromIndex) =>
    Object.entries(asRecord(nested))
      .map(([to, rawWeight], toIndex) =>
        readEdge(
          {
            from,
            to,
            weight: rawWeight,
            id: `${from}-${to}`,
          },
          fromIndex + toIndex,
          playerDirectory,
        ),
      )
      .filter((edge): edge is NetworkEdge => edge !== null),
  );
}

/** Exposed so the endpoint-name contract can be covered by a test. */
export const buildEdgesForTest = buildEdges;

function buildPlayers(data: Record<string, unknown>, edges: NetworkEdge[]) {
  const directory = buildPlayerDirectory(data);

  edges.forEach((edge) => {
    [edge.from, edge.to].forEach((id) => {
      if (directory.has(id)) {
        return;
      }

      directory.set(id, {
        id,
        name: id,
        color: resolvePlayerFallbackColor(null, directory.size),
      });
    });
  });

  return [...directory.values()].filter((player) =>
    edges.some((edge) => edge.from === player.id || edge.to === player.id),
  );
}

function getNodePositions(players: NetworkPlayer[], focusPlayerId: string | null) {
  const centerX = SVG_WIDTH / 2;
  const centerY = SVG_HEIGHT / 2;
  const radiusX = 300;
  const radiusY = 135;
  const orderedPlayers = focusPlayerId
    ? [
        ...players.filter((player) => player.id === focusPlayerId),
        ...players.filter((player) => player.id !== focusPlayerId),
      ]
    : players;

  return new Map(
    orderedPlayers.map((player, index) => {
      const angle = orderedPlayers.length === 1
        ? -Math.PI / 2
        : (index / orderedPlayers.length) * Math.PI * 2 - Math.PI / 2;

      return [
        player.id,
        {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
        },
      ];
    }),
  );
}

function getEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  offset: number,
) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const curveX = midX + (-dy / distance) * offset;
  const curveY = midY + (dx / distance) * offset;

  return {
    d: `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${curveX.toFixed(1)} ${curveY.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
    labelX: curveX,
    labelY: curveY,
  };
}

function shortenName(value: string) {
  const normalized = value.trim();
  return normalized.length > 12 ? `${normalized.slice(0, 11)}...` : normalized;
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
  const edges = buildEdges(payload.data).sort((left, right) => right.weight - left.weight);
  const players = buildPlayers(payload.data, edges);
  const meta = asRecord(payload.data.meta);
  const requestedFocusPlayerId = toText(
    payload.data.focusPlayerId ?? payload.data.playerId ?? meta.focusPlayerId,
  ).trim();
  const focusedPlayer =
    players.find((player) => player.id === requestedFocusPlayerId) ?? null;
  const positions = getNodePositions(players, focusedPlayer?.id ?? null);
  const maxWeight = Math.max(1, ...edges.map((edge) => edge.weight));
  const focusedSummaryEdges = focusedPlayer
    ? edges.filter(
        (edge) => edge.from === focusedPlayer.id || edge.to === focusedPlayer.id,
      )
    : edges;

  if (edges.length === 0 || players.length === 0) {
    return (
      <EmptyStatePanel
        eyebrow="Assist Flow Network"
        title="No relationship edges returned"
        copy="No assists have been recorded between these players yet."
      />
    );
  }

  return (
    <div className="view-stack">

      <DashboardPanel tone="success">
        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          <ChartLabelStrip
            family="Assist Flow Network"
            series={[
              { color: "var(--blue)", label: "Players" },
              { color: "var(--accent)", label: "Assist Direction" },
            ]}
            xLabel="Source Player"
            yLabel="Assist Weight"
          />
          {focusedPlayer ? (
            <div
              aria-live="polite"
              role="status"
              style={{
                color: "var(--text-strong)",
                fontSize: "0.9rem",
                fontWeight: 800,
              }}
            >
              Focus: {focusedPlayer.name}
            </div>
          ) : null}
          <svg
            aria-label="Assist network diagram"
            data-focus-player-id={focusedPlayer?.id}
            role="img"
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            style={{
              background: "rgba(7, 12, 28, 0.56)",
              border: "1px solid rgba(45, 212, 191, 0.18)",
              borderRadius: "1rem",
              minHeight: "320px",
              width: "100%",
            }}
          >
            <defs>
              <marker
                id="assist-network-arrow"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
                viewBox="0 0 8 8"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(255,255,255,0.72)" />
              </marker>
            </defs>

            {edges.map((edge) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);
              if (!from || !to) {
                return null;
              }

              const fromPlayer = players.find((player) => player.id === edge.from);
              const isFocusEdge =
                !focusedPlayer ||
                edge.from === focusedPlayer.id ||
                edge.to === focusedPlayer.id;
              const strokeWidth = 1.75 + (edge.weight / maxWeight) * 4;
              // The bow is perpendicular to the edge's own direction, so A→B
              // and B→A already curve to opposite sides under one constant.
              // Alternating the sign by position in the array cancelled that
              // out whenever the two indices shared parity, drawing one curve
              // over the other with both labels stacked on the same point.
              const path = getEdgePath(from, to, EDGE_BOW);

              return (
                <g key={edge.id}>
                  <path
                    d={path.d}
                    fill="none"
                    markerEnd="url(#assist-network-arrow)"
                    opacity={
                      (0.52 + (edge.weight / maxWeight) * 0.34) *
                      (isFocusEdge ? 1 : 0.2)
                    }
                    stroke={fromPlayer?.color ?? "rgba(255,255,255,0.72)"}
                    strokeLinecap="round"
                    strokeWidth={strokeWidth}
                  />
                  <text
                    fill="rgba(226,232,240,0.84)"
                    fontSize="12"
                    fontWeight="700"
                    textAnchor="middle"
                    x={path.labelX}
                    y={path.labelY - 8}
                  >
                    {edge.label}
                  </text>
                  <text
                    fill="rgba(45,212,191,0.92)"
                    fontSize="11"
                    fontWeight="800"
                    textAnchor="middle"
                    x={path.labelX}
                    y={path.labelY + 8}
                  >
                    {edge.weight.toFixed(Number.isInteger(edge.weight) ? 0 : 1)}
                  </text>
                </g>
              );
            })}

            {players.map((player) => {
              const position = positions.get(player.id);
              if (!position) {
                return null;
              }

              const isFocusedPlayer = player.id === focusedPlayer?.id;

              return (
                <g key={player.id}>
                  <circle
                    cx={position.x}
                    cy={position.y}
                    fill={player.color}
                    opacity={isFocusedPlayer ? "0.42" : "0.18"}
                    r={NODE_RADIUS + (isFocusedPlayer ? 15 : 10)}
                  />
                  <circle
                    cx={position.x}
                    cy={position.y}
                    fill="rgba(7, 12, 28, 0.95)"
                    r={NODE_RADIUS}
                    stroke={player.color}
                    strokeWidth={isFocusedPlayer ? "5" : "3"}
                  />
                  {isFocusedPlayer ? (
                    <text
                      aria-hidden="true"
                      fill={player.color}
                      fontSize="10"
                      fontWeight="900"
                      letterSpacing="1.5"
                      textAnchor="middle"
                      x={position.x}
                      y={position.y - NODE_RADIUS - 20}
                    >
                      FOCUS
                    </text>
                  ) : null}
                  <text
                    fill="rgba(248,250,252,0.96)"
                    fontSize="13"
                    fontWeight="800"
                    textAnchor="middle"
                    x={position.x}
                    y={position.y + NODE_RADIUS + 24}
                  >
                    {shortenName(player.name)}
                  </text>
                </g>
              );
            })}
          </svg>

          <div
            style={{
              display: "grid",
              gap: "0.6rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            }}
          >
            {focusedSummaryEdges.slice(0, 6).map((edge) => (
              <div
                key={`summary-${edge.id}`}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "0.75rem",
                  background: "rgba(255, 255, 255, 0.035)",
                  padding: "0.75rem",
                }}
              >
                <div
                  style={{
                    color: "var(--text-strong)",
                    fontWeight: 800,
                  }}
                >
                  {edge.label}
                </div>
                <div
                  style={{
                    color: "var(--sub)",
                    fontSize: "0.85rem",
                    marginTop: "0.2rem",
                  }}
                >
                  {edge.detail ??
                    `Weight ${edge.weight.toFixed(
                      Number.isInteger(edge.weight) ? 0 : 1,
                    )}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
