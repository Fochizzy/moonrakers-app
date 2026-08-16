import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeCloudSnapshot } from "../../../../../lib/cloud/normalizeCloudSnapshot";

import {
  buildRenderableChartDataset,
  chartDatasetHasRenderableData,
} from "./chartFallback";

describe("buildRenderableChartDataset", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders radar fallback data from display-name-only legacy participants", () => {
    let nowValue = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      nowValue += 1;
      return nowValue;
    });

    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "legacy-game-1",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: null,
          game_participants: [
            {
              id: "legacy-participant-1",
              profile_id: null,
              player_name_snapshot: null,
              display_name_snapshot: "Fochizzy",
              color_snapshot: "#ffffff",
              assigned_card_art_index_snapshot: 1,
              start_order: 0,
              total_prestige: 14,
              direct_prestige: 8,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 14,
              assists: 1,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          game_rounds: [],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "radar",
      dataset: {
        chartKey: "radar",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Analytics chart",
        subtitle: "Server-authored placeholder dataset.",
        emptyState: {
          title: "No chart data yet",
          subtitle: "The chart route is wired, but this dataset is currently empty.",
        },
        data: {
          meta: {
            hasData: false,
            pointCount: 0,
            focusPlayerId: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
          },
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
        comparePlayerId: null,
        scopedPlayerIds: [],
        metricKey: null,
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect(chartDatasetHasRenderableData(dataset)).toBe(true);
    expect((dataset.data as Record<string, unknown>).meta).toEqual(
      expect.objectContaining({
        hasData: true,
      }),
    );
    expect((dataset.data as Record<string, unknown>).rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Finisher",
          focusValue: expect.any(Number),
        }),
      ]),
    );
  });

  it("rebuilds an elo fallback series when the published payload claims data but has no numeric chart rows", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "elo-game-1",
          created_at: "2026-07-05T00:00:00.000Z",
          winner_profile_id: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
          game_participants: [
            {
              id: "elo-participant-focus-1",
              profile_id: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 9,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 15,
              assists: 1,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
            {
              id: "elo-participant-rival-1",
              profile_id: "b32f2e38-1ad3-46d5-af13-ead5ef9f1427",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 12,
              direct_prestige: 6,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 12,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
          ],
          game_rounds: [],
        },
        {
          id: "elo-game-2",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: "b32f2e38-1ad3-46d5-af13-ead5ef9f1427",
          game_participants: [
            {
              id: "elo-participant-focus-2",
              profile_id: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 10,
              direct_prestige: 4,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 10,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
            {
              id: "elo-participant-rival-2",
              profile_id: "b32f2e38-1ad3-46d5-af13-ead5ef9f1427",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 16,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 4,
              score: 16,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          game_rounds: [],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "elo",
      dataset: {
        chartKey: "elo",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Elo trend",
        subtitle: "Server-authored placeholder dataset for Elo.",
        emptyState: {
          title: "No chart data yet",
          subtitle: "The chart route is wired, but this dataset is currently empty.",
        },
        data: {
          meta: {
            hasData: true,
            pointCount: 1,
            focusPlayerId: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
          },
          data: [
            {
              label: "Server placeholder",
              note: "Missing numeric series",
            },
          ],
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
        comparePlayerId: null,
        scopedPlayerIds: [],
        metricKey: null,
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect(chartDatasetHasRenderableData(dataset)).toBe(true);
    expect((dataset.data as Record<string, unknown>).meta).toEqual(
      expect.objectContaining({
        hasData: true,
        metricKey: "elo",
      }),
    );
    expect((dataset.data as Record<string, unknown>).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Game 1",
          elo: expect.any(Number),
        }),
        expect.objectContaining({
          label: "Game 2",
          elo: expect.any(Number),
        }),
      ]),
    );
  });

  it("builds rivalry comparison rows from native games and players payloads", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "rivalry-game-1",
          created_at: "2026-07-05T00:00:00.000Z",
          winner_profile_id: "focus-player",
          game_participants: [
            {
              id: "rivalry-participant-focus-1",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 9,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 15,
              assists: 1,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
            {
              id: "rivalry-participant-rival-1",
              profile_id: "rival-player",
              player_name_snapshot: "GregMTG",
              display_name_snapshot: "GregMTG",
              start_order: 1,
              total_prestige: 12,
              direct_prestige: 7,
              assist_prestige_received: 1,
              objective_prestige: 4,
              score: 12,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
          ],
          game_rounds: [],
        },
        {
          id: "rivalry-game-2",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: "rival-player",
          game_participants: [
            {
              id: "rivalry-participant-focus-2",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 10,
              direct_prestige: 4,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 10,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
            {
              id: "rivalry-participant-rival-2",
              profile_id: "rival-player",
              player_name_snapshot: "GregMTG",
              display_name_snapshot: "GregMTG",
              start_order: 1,
              total_prestige: 16,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 4,
              score: 16,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          game_rounds: [],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "rivalry_graph",
      dataset: {
        chartKey: "rivalry_graph",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Rivalry graph",
        subtitle: "Server-authored placeholder dataset for rivalry graphs.",
        emptyState: {
          title: "No rivalry graph yet",
          subtitle: "Finish at least one tracked game to populate rivalry data.",
        },
        data: {
          meta: {
            hasData: false,
            pointCount: 0,
            focusPlayerId: "focus-player",
            comparePlayerId: "rival-player",
          },
          games: snapshot.games,
          players: snapshot.players,
          playerId: "focus-player",
          compareId: "rival-player",
        },
      },
      controls: {
        focusPlayerId: "focus-player",
        comparePlayerId: "rival-player",
        scopedPlayerIds: [],
        metricKey: null,
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect((dataset.data as Record<string, unknown>).rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          focusValue: expect.any(Number),
          compareValue: expect.any(Number),
        }),
      ]),
    );
  });

  it("rebuilds sparkline focus and compare series from placeholder datasets", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "sparkline-game-1",
          created_at: "2026-07-05T00:00:00.000Z",
          winner_profile_id: "focus-player",
          game_participants: [
            {
              id: "sparkline-participant-focus-1",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 9,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 15,
              assists: 1,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
            {
              id: "sparkline-participant-rival-1",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 12,
              direct_prestige: 6,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 12,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
          ],
          game_rounds: [],
        },
        {
          id: "sparkline-game-2",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: "rival-player",
          game_participants: [
            {
              id: "sparkline-participant-focus-2",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 10,
              direct_prestige: 4,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 10,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
            {
              id: "sparkline-participant-rival-2",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 16,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 4,
              score: 16,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          game_rounds: [],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "sparkline",
      dataset: {
        chartKey: "sparkline",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Analytics chart",
        subtitle: "Server-authored placeholder dataset.",
        emptyState: {
          title: "No sparkline data yet",
          subtitle: "Finish at least one tracked game to populate sparkline summaries.",
        },
        data: {
          meta: {
            hasData: true,
            pointCount: 2,
            focusPlayerId: "focus-player",
            comparePlayerId: "rival-player",
          },
          data: [
            { label: "Sample 1", assistEfficiency: 1 },
            { label: "Sample 2", assistEfficiency: 2 },
          ],
          comparisonData: [
            { label: "Sample 1", assistEfficiency: 1 },
            { label: "Sample 2", assistEfficiency: 2 },
          ],
          metricKey: "score",
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: "focus-player",
        comparePlayerId: "rival-player",
        scopedPlayerIds: [],
        metricKey: "score",
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect((dataset.data as Record<string, unknown>).primaryLabel).toBe("Fochizzy");
    expect((dataset.data as Record<string, unknown>).comparisonLabel).toBe("Corey");
    expect((dataset.data as Record<string, unknown>).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Game 1",
          score: 15,
        }),
        expect.objectContaining({
          label: "Game 2",
          score: 10,
        }),
      ]),
    );
    expect((dataset.data as Record<string, unknown>).comparisonData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Game 1",
          score: 12,
        }),
        expect.objectContaining({
          label: "Game 2",
          score: 16,
        }),
      ]),
    );
  });

  it("rebuilds line-chart snapshots from placeholder datasets and preserves the requested line mode", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "line-game-1",
          created_at: "2026-07-05T00:00:00.000Z",
          winner_profile_id: "focus-player",
          game_participants: [
            {
              id: "line-participant-focus-1",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 9,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 15,
              assists: 1,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
            {
              id: "line-participant-rival-1",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 12,
              direct_prestige: 6,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 12,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
          ],
          game_rounds: [],
        },
        {
          id: "line-game-2",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: "rival-player",
          game_participants: [
            {
              id: "line-participant-focus-2",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 10,
              direct_prestige: 4,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 10,
              assists: 1,
              failures: 1,
              contracts: 2,
              is_winner: false,
            },
            {
              id: "line-participant-rival-2",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 16,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 4,
              score: 16,
              assists: 2,
              failures: 0,
              contracts: 3,
              is_winner: true,
            },
          ],
          game_rounds: [],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "line_chart",
      dataset: {
        chartKey: "line_chart",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Analytics chart",
        subtitle: "Server-authored placeholder dataset for line charts.",
        emptyState: {
          title: "No line chart yet",
          subtitle: "Finish at least one tracked game to populate line-chart history.",
        },
        data: {
          data: [
            { label: "Sample 1", y: 1 },
            { label: "Sample 2", y: 2 },
          ],
          players: [{ id: "focus-player", name: "Fochizzy" }],
          statKey: "score",
          selectedPlayerIds: [],
          scopedPlayerIds: [],
          mode: "raw",
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: "focus-player",
        comparePlayerId: null,
        scopedPlayerIds: [],
        metricKey: "contractSuccessRate",
        lineMode: "average",
        eloTab: null,
        opponentId: null,
      },
    });

    expect((dataset.data as Record<string, unknown>).mode).toBe("average");
    expect((dataset.data as Record<string, unknown>).metricKey).toBe("contractSuccessRate");
    expect((dataset.data as Record<string, unknown>).players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "focus-player", name: "Fochizzy" }),
        expect.objectContaining({ id: "rival-player", name: "Corey" }),
      ]),
    );
    expect((dataset.data as Record<string, unknown>).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Game 1",
          snapshot: expect.objectContaining({
            "focus-player": expect.objectContaining({
              contractSuccessRate: 75,
            }),
            "rival-player": expect.objectContaining({
              contractSuccessRate: 50,
            }),
          }),
        }),
        expect.objectContaining({
          label: "Game 2",
          snapshot: expect.objectContaining({
            "focus-player": expect.objectContaining({
              contractSuccessRate: expect.closeTo(66.66666666666666, 10),
            }),
            "rival-player": expect.objectContaining({
              contractSuccessRate: 100,
            }),
          }),
        }),
      ]),
    );
  });

  it("rebuilds bar chart rows from placeholder datasets using the active metric", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "bar-game-1",
          created_at: "2026-07-05T00:00:00.000Z",
          winner_profile_id: "focus-player",
          game_participants: [
            {
              id: "bar-participant-focus-1",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 9,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 15,
              assists: 1,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
            {
              id: "bar-participant-rival-1",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 12,
              direct_prestige: 6,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 12,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
          ],
          game_rounds: [],
        },
        {
          id: "bar-game-2",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: "rival-player",
          game_participants: [
            {
              id: "bar-participant-focus-2",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 10,
              direct_prestige: 4,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 10,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
            {
              id: "bar-participant-rival-2",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 16,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 4,
              score: 16,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          game_rounds: [],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "bar_chart",
      dataset: {
        chartKey: "bar_chart",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Analytics chart",
        subtitle: "Server-authored placeholder dataset.",
        emptyState: {
          title: "No bar chart data yet",
          subtitle: "Finish at least one tracked game to populate the latest metric comparison.",
        },
        data: {
          meta: {
            hasData: true,
            pointCount: 4,
            focusPlayerId: "focus-player",
            metricKey: "totalPrestige",
          },
          data: [
            { label: 0, totalPrestige: 0 },
            { label: 0, totalPrestige: 0 },
          ],
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: "focus-player",
        comparePlayerId: null,
        scopedPlayerIds: [],
        metricKey: "totalPrestige",
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect((dataset.data as Record<string, unknown>).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Fochizzy",
          totalPrestige: 10,
        }),
        expect.objectContaining({
          label: "Corey",
          totalPrestige: 16,
        }),
      ]),
    );
  });

  it("builds bar chart rows from native games and players payloads", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "native-bar-game-1",
          created_at: "2026-07-05T00:00:00.000Z",
          winner_profile_id: "focus-player",
          game_participants: [
            {
              id: "native-bar-focus-1",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 9,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 15,
              assists: 1,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
            {
              id: "native-bar-rival-1",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 12,
              direct_prestige: 6,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 12,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
          ],
          game_rounds: [],
        },
        {
          id: "native-bar-game-2",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: "rival-player",
          game_participants: [
            {
              id: "native-bar-focus-2",
              profile_id: "focus-player",
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              start_order: 0,
              total_prestige: 10,
              direct_prestige: 4,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 10,
              assists: 1,
              failures: 2,
              contracts: 2,
              is_winner: false,
            },
            {
              id: "native-bar-rival-2",
              profile_id: "rival-player",
              player_name_snapshot: "Corey",
              display_name_snapshot: "Corey",
              start_order: 1,
              total_prestige: 16,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 4,
              score: 16,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          game_rounds: [],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "bar_chart",
      dataset: {
        chartKey: "bar_chart",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Analytics chart",
        subtitle: "Server-authored placeholder dataset.",
        emptyState: {
          title: "No bar chart data yet",
          subtitle: "Finish at least one tracked game to populate the latest metric comparison.",
        },
        data: {
          meta: {
            hasData: false,
            pointCount: 0,
            focusPlayerId: "focus-player",
            metricKey: "totalPrestige",
          },
          games: snapshot.games,
          players: snapshot.players,
          playerId: "focus-player",
        },
      },
      controls: {
        focusPlayerId: "focus-player",
        comparePlayerId: null,
        scopedPlayerIds: [],
        metricKey: "totalPrestige",
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect((dataset.data as Record<string, unknown>).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Fochizzy",
          totalPrestige: 10,
        }),
        expect.objectContaining({
          label: "Corey",
          totalPrestige: 16,
        }),
      ]),
    );
  });

  it("keeps relationship graph edges when the focus player has no direct assist edge", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "relationship-game-1",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: "focus-player",
          game_participants: [
            {
              id: "relationship-participant-focus",
              profile_id: "focus-player",
              player_name_snapshot: "RevLoki",
              display_name_snapshot: "RevLoki",
              start_order: 0,
              total_prestige: 10,
              direct_prestige: 7,
              assist_prestige_received: 0,
              objective_prestige: 3,
              score: 10,
              assists: 0,
              failures: 1,
              contracts: 2,
              is_winner: true,
            },
            {
              id: "relationship-participant-helper",
              profile_id: "helper-player",
              player_name_snapshot: "Greg",
              display_name_snapshot: "Greg",
              start_order: 1,
              total_prestige: 12,
              direct_prestige: 8,
              assist_prestige_received: 0,
              objective_prestige: 4,
              score: 12,
              assists: 1,
              failures: 0,
              contracts: 3,
              is_winner: false,
            },
            {
              id: "relationship-participant-recipient",
              profile_id: "recipient-player",
              player_name_snapshot: "Izzy",
              display_name_snapshot: "Izzy",
              start_order: 2,
              total_prestige: 14,
              direct_prestige: 8,
              assist_prestige_received: 2,
              objective_prestige: 4,
              score: 14,
              assists: 0,
              failures: 0,
              contracts: 3,
              is_winner: false,
            },
          ],
          game_rounds: [
            {
              participant_id: "relationship-participant-helper",
              round_index: 1,
              prestige: 4,
              contracts: 1,
              failures: 0,
              assist_recipients: {
                "relationship-participant-recipient": 1,
              },
              assist_prestige_recipients: {
                "relationship-participant-recipient": 2,
              },
              objective_count: 0,
              objective_prestige: 0,
              created_at: "2026-07-06T00:01:00.000Z",
            },
          ],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "relationship_graph",
      dataset: {
        chartKey: "relationship_graph",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Relationship graph",
        subtitle: "Server-authored relationship flow from published assist links.",
        emptyState: {
          title: "No relationship graph yet",
          subtitle: "Finish at least one tracked game with assists to populate relationship data.",
        },
        data: {
          meta: {
            hasData: false,
            pointCount: 0,
            focusPlayerId: "focus-player",
            comparePlayerId: "helper-player",
          },
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: "focus-player",
        comparePlayerId: "helper-player",
        scopedPlayerIds: [],
        metricKey: null,
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect((dataset.data as Record<string, unknown>).relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "helper-player",
          to: "recipient-player",
          weight: 2,
        }),
      ]),
    );
  });

  it("builds relationship graph edges from assist counts when prestige source maps are absent", () => {
    const snapshot = normalizeCloudSnapshot({
      games: [
        {
          id: "relationship-game-count-only",
          created_at: "2026-07-06T00:00:00.000Z",
          winner_profile_id: null,
          game_participants: [
            {
              id: "relationship-count-focus",
              profile_id: "focus-player",
              player_name_snapshot: "RevLoki",
              display_name_snapshot: "RevLoki",
              start_order: 0,
              total_prestige: 11,
              direct_prestige: 7,
              assist_prestige_received: 0,
              objective_prestige: 4,
              score: 11,
              assists: 0,
              failures: 0,
              contracts: 2,
              is_winner: true,
            },
            {
              id: "relationship-count-helper",
              profile_id: "helper-player",
              player_name_snapshot: "Greg",
              display_name_snapshot: "Greg",
              start_order: 1,
              total_prestige: 10,
              direct_prestige: 6,
              assist_prestige_received: 0,
              objective_prestige: 4,
              score: 10,
              assists: 1,
              failures: 1,
              contracts: 2,
              is_winner: false,
            },
            {
              id: "relationship-count-recipient",
              profile_id: "recipient-player",
              player_name_snapshot: "Izzy",
              display_name_snapshot: "Izzy",
              start_order: 2,
              total_prestige: 13,
              direct_prestige: 9,
              assist_prestige_received: 0,
              objective_prestige: 4,
              score: 13,
              assists: 0,
              failures: 0,
              contracts: 3,
              is_winner: false,
            },
          ],
          game_rounds: [
            {
              participant_id: "relationship-count-helper",
              round_index: 1,
              prestige: 4,
              contracts: 1,
              failures: 0,
              assist_recipients: {
                "relationship-count-recipient": 1,
              },
              objective_count: 0,
              objective_prestige: 0,
              created_at: "2026-07-06T00:01:00.000Z",
            },
          ],
        },
      ],
    });

    const dataset = buildRenderableChartDataset({
      chartKey: "relationship_graph",
      dataset: {
        chartKey: "relationship_graph",
        generatedAt: "2026-07-06T00:00:00.000Z",
        title: "Relationship graph",
        subtitle: "Server-authored relationship flow from published assist links.",
        emptyState: {
          title: "No relationship graph yet",
          subtitle: "Finish at least one tracked game with assists to populate relationship data.",
        },
        data: {
          meta: {
            hasData: false,
            pointCount: 0,
            focusPlayerId: "focus-player",
          },
          sourceGames: snapshot.games,
          sourcePlayers: snapshot.players,
        },
      },
      controls: {
        focusPlayerId: "focus-player",
        comparePlayerId: null,
        scopedPlayerIds: [],
        metricKey: null,
        lineMode: null,
        eloTab: null,
        opponentId: null,
      },
    });

    expect((dataset.data as Record<string, unknown>).relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "helper-player",
          to: "recipient-player",
          weight: 1,
        }),
      ]),
    );
  });

  it("treats assist-network edge payloads with assistCount as renderable relationship data", () => {
    expect(
      chartDatasetHasRenderableData({
        chartKey: "relationship_graph",
        generatedAt: "2026-07-06T00:00:00.000Z",
        data: {
          edges: [
            {
              id: "helper__recipient",
              sourceId: "helper-player",
              targetId: "recipient-player",
              assistCount: 1,
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it("treats published relationship links as renderable relationship data", () => {
    expect(
      chartDatasetHasRenderableData({
        chartKey: "relationship_graph",
        generatedAt: "2026-07-06T00:00:00.000Z",
        data: {
          links: [
            {
              id: "helper__recipient",
              source: "helper-player",
              target: "recipient-player",
              value: 1.5,
            },
          ],
        },
      }),
    ).toBe(true);
  });
});
