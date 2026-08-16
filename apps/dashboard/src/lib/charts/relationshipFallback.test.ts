import { describe, expect, it } from "vitest";

import { normalizeCloudSnapshot } from "../../../../../lib/cloud/normalizeCloudSnapshot";

import { buildEdgesForTest } from "@/components/charts/renderers/NetworkChartPanel";

import { buildRenderableChartDataset } from "./chartFallback";

const FOCUS_ID = "ff4d1f2b-5b12-4b38-90a6-469257356d7e";
const RIVAL_ID = "86c268a3-da81-42a5-8cf1-75e3a8bcbb48";

function participant(
  profileId: string,
  name: string,
  startOrder: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `${profileId}-row`,
    profile_id: profileId,
    player_name_snapshot: name,
    display_name_snapshot: name,
    color_snapshot: startOrder === 0 ? "purple" : "yellow",
    assigned_card_art_index_snapshot: startOrder,
    start_order: startOrder,
    total_prestige: 12,
    direct_prestige: 8,
    assist_prestige_received: 3,
    objective_prestige: 1,
    score: 30,
    assists: 2,
    failures: 1,
    contracts: 4,
    is_winner: startOrder === 0,
    ...overrides,
  };
}

/**
 * The assist network is the one chart family with no local fallback path that
 * had ever been exercised, and it rendered "No relationship edges returned" in
 * production against data that does carry assists.
 */
describe("relationship graph fallback", () => {
  const snapshot = normalizeCloudSnapshot({
    games: [
      {
        id: "game-1",
        created_at: "2026-07-06T00:00:00.000Z",
        winner_profile_id: FOCUS_ID,
        game_participants: [
          participant(FOCUS_ID, "Fochizzy", 0),
          participant(RIVAL_ID, "RevLoki", 1),
        ],
        game_rounds: [
          {
            participant_id: `${RIVAL_ID}-row`,
            round_index: 0,
            prestige: 3,
            contracts: 1,
            failures: 0,
            // RevLoki assisted Fochizzy for 3 prestige.
            assist_recipients: { [`${FOCUS_ID}-row`]: 1 },
            assist_prestige_recipients: { [`${FOCUS_ID}-row`]: 3 },
            objective_count: 0,
            objective_prestige: 0,
            created_at: "2026-07-06T00:01:00.000Z",
          },
        ],
      },
    ],
  });

  it("carries the assist source map through the snapshot normalizer", () => {
    const totals = snapshot.games[0]?.totals as Record<
      string,
      { assistPrestigeBySource?: Record<string, number> }
    >;

    expect(totals[FOCUS_ID]?.assistPrestigeBySource).toEqual({ [RIVAL_ID]: 3 });
  });

  it("builds directed edges rather than an empty graph", () => {
    const dataset = buildRenderableChartDataset({
      chartKey: "relationship_graph",
      dataset: {
        chartKey: "relationship_graph",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Analytics chart",
        subtitle: "Server-authored placeholder dataset.",
        data: {
          meta: { hasData: false, pointCount: 0 },
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: FOCUS_ID,
        comparePlayerId: null,
        scopedPlayerIds: [],
        metricKey: null,
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    const edges = (dataset.data as { edges?: unknown[] }).edges ?? [];

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      from: RIVAL_ID,
      to: FOCUS_ID,
      weight: 3,
    });
  });
});

describe("published assist edges", () => {
  it("reads the fromId/toId endpoint names the chart RPC publishes", () => {
    const edges = buildEdgesForTest({
      nodes: [
        { id: "corey", label: "Corey" },
        { id: "fochizzy", label: "Fochizzy" },
      ],
      edges: [
        {
          fromId: "corey",
          toId: "fochizzy",
          weight: 1.053,
          assistCount: 20,
          assistPrestige: 15,
        },
      ],
    });

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      from: "corey",
      to: "fochizzy",
      label: "Corey → Fochizzy",
      detail: "20 assists · 15 prestige",
    });
  });
});
