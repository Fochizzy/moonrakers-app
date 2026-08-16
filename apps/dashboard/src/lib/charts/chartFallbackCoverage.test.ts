import { describe, expect, it } from "vitest";

import { normalizeCloudSnapshot } from "../../../../../lib/cloud/normalizeCloudSnapshot";

import {
  buildChartControls,
  buildRenderableChartDataset,
  chartDatasetHasRenderableData,
} from "./chartFallback";

/**
 * `get_chart_dataset` reads precomputed datasets out of `personal_stats_rollups`,
 * and against the live project that rollup only carries `relationship_graph`.
 * Every other chart therefore arrives as an empty placeholder and the local
 * fallback is what actually renders it. These fixtures mirror the row shapes the
 * live tables return (participant-row-id keyed rounds, snapshot names, colors as
 * CSS color words) so the fallback is exercised the way production hits it.
 */

const PLAYERS = [
  { profileId: "p-greg", name: "Greg", display: "GregMTG", color: "blue", art: 0 },
  { profileId: "p-corey", name: "Corey", display: "Corey", color: "green", art: 16 },
  { profileId: "p-izzy", name: "Izzy", display: "Fochizzy", color: "purple", art: 2 },
  { profileId: "p-james", name: "James", display: "RevLoki", color: "yellow", art: 4 },
];

const FOCUS_ID = "p-izzy";
const COMPARE_ID = "p-corey";

function buildRawGame(gameIndex: number) {
  const gameId = `game-${gameIndex}`;
  const participants = PLAYERS.map((player, seat) => {
    const swing = (gameIndex + seat) % 5;

    return {
      id: `${gameId}-part-${seat}`,
      profile_id: player.profileId,
      player_name_snapshot: player.name,
      display_name_snapshot: player.display,
      color_snapshot: player.color,
      assigned_card_art_index_snapshot: player.art,
      start_order: seat,
      total_prestige: 8 + swing * 2,
      direct_prestige: 5 + swing,
      assist_prestige_received: swing,
      objective_prestige: gameIndex % 3,
      score: 30 + swing * 6,
      assists: swing,
      failures: (gameIndex + seat) % 3,
      contracts: 3 + (seat % 3),
      is_winner: seat === gameIndex % PLAYERS.length,
    };
  });

  const rounds = Array.from({ length: 20 }, (_, roundIndex) => {
    const seat = roundIndex % PLAYERS.length;
    const target = PLAYERS[(seat + 1) % PLAYERS.length]!.profileId;

    return {
      participant_id: `${gameId}-part-${seat}`,
      round_index: roundIndex,
      prestige: (roundIndex % 4) + (seat % 2),
      contracts: roundIndex % 2,
      failures: roundIndex % 7 === 0 ? 1 : 0,
      assist_recipients: roundIndex % 3 === 0 ? { [target]: 1 } : {},
      assist_prestige_recipients: roundIndex % 3 === 0 ? { [target]: 1 } : {},
      objective_count: roundIndex % 6 === 0 ? 1 : 0,
      objective_prestige: roundIndex % 6 === 0 ? 1 : 0,
      created_at: new Date(Date.UTC(2026, 6, 1 + gameIndex, 12, roundIndex)).toISOString(),
    };
  });

  return {
    id: gameId,
    host_profile_id: FOCUS_ID,
    group_id: "group-1",
    group_name_snapshot: "Wake Up!",
    created_at: new Date(Date.UTC(2026, 6, 1 + gameIndex, 12)).toISOString(),
    winner_profile_id: participants.find((row) => row.is_winner)?.profile_id ?? null,
    game_participants: participants,
    game_rounds: rounds,
  };
}

const SNAPSHOT = normalizeCloudSnapshot({
  games: Array.from({ length: 12 }, (_, index) => buildRawGame(index)) as never,
});

const HISTORY = {
  games: SNAPSHOT.games as unknown as Array<Record<string, unknown>>,
  players: SNAPSHOT.players as unknown as Array<Record<string, unknown>>,
};

/** The placeholder shape `get_chart_dataset` returns when the rollup has no entry. */
function emptyServerDataset(chartKey: string) {
  return {
    chartKey,
    generatedAt: "2026-08-13T19:09:36.552Z",
    title: "Analytics chart",
    subtitle: "Server-authored placeholder dataset.",
    emptyState: {
      title: "No chart data yet",
      description: "Finish at least one tracked game to populate this chart.",
    },
    data: {
      meta: { hasData: false, pointCount: 0 },
      sourceGames: HISTORY.games,
      sourcePlayers: HISTORY.players,
    },
  };
}

function renderChart(chartKey: string) {
  const dataset = emptyServerDataset(chartKey);
  const controls = buildChartControls({
    dataset,
    setup: {
      defaults: {
        focusPlayerId: FOCUS_ID,
        comparePlayerId: COMPARE_ID,
        scopedPlayerIds: PLAYERS.map((player) => player.profileId),
      },
    },
  });

  return buildRenderableChartDataset({ chartKey, dataset, controls });
}

const RENDERABLE_CHART_KEYS = [
  "radar",
  "compare",
  "elo",
  "prestige_over_time",
  "relationship_graph",
  "rivalry_graph",
  "head_to_head",
  "sparkline",
  "line_chart",
  "bar_chart",
  "bump_chart",
  "heatmap",
  "efficiency_failure_scatter",
  "replay_chart",
];

describe("chart fallback coverage against live-shaped history", () => {
  it("normalizes the raw rows into games with usable totals", () => {
    expect(SNAPSHOT.games).toHaveLength(12);
    expect(SNAPSHOT.players.length).toBeGreaterThanOrEqual(4);

    const [game] = SNAPSHOT.games;
    expect(game?.rounds?.length).toBe(20);
    expect(Object.keys(game?.totals ?? {})).toHaveLength(4);
  });

  it.each(RENDERABLE_CHART_KEYS)(
    "builds renderable data for %s when the server returns a placeholder",
    (chartKey) => {
      const rendered = renderChart(chartKey);

      expect(chartDatasetHasRenderableData(rendered)).toBe(true);
    },
  );

  // Negative control: without local history the same placeholder must stay
  // unrenderable, so a passing suite above really is the fallback doing work.
  it.each(RENDERABLE_CHART_KEYS)(
    "leaves %s unrenderable when there is no history to fall back on",
    (chartKey) => {
      const dataset = {
        ...emptyServerDataset(chartKey),
        data: { meta: { hasData: false, pointCount: 0 } },
      };
      const controls = buildChartControls({
        dataset,
        setup: { defaults: { focusPlayerId: FOCUS_ID } },
      });

      expect(
        chartDatasetHasRenderableData(
          buildRenderableChartDataset({ chartKey, dataset, controls }),
        ),
      ).toBe(false);
    },
  );

  it("keeps the server dataset when it already carries real data", () => {
    const served = {
      ...emptyServerDataset("elo"),
      data: {
        meta: { hasData: true, pointCount: 3 },
        data: [{ label: "G1", value: 1000 }],
      },
    };
    const controls = buildChartControls({ dataset: served, setup: { defaults: {} } });

    expect(
      buildRenderableChartDataset({ chartKey: "elo", dataset: served, controls }).data,
    ).toBe(served.data);
  });
});
