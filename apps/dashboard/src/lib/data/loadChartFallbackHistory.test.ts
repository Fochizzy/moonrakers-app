import { describe, expect, it, vi } from "vitest";

import { loadChartFallbackHistory } from "./loadChartFallbackHistory";

type QueryDescriptor = {
  table: string;
  resolveOn: "eq" | "ilike" | "order";
  result: {
    data: Array<Record<string, unknown>>;
    error: unknown;
  };
};

function createSupabaseMock(sequence: QueryDescriptor[]) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const pending = [...sequence];

  const from = vi.fn((table: string) => {
    const descriptor = pending.shift();
    expect(descriptor?.table).toBe(table);

    const chain = {
      select: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "select", args });
        return chain;
      }),
      eq: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "eq", args });
        if (descriptor?.resolveOn === "eq") {
          return Promise.resolve(descriptor.result);
        }
        return chain;
      }),
      ilike: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "ilike", args });
        if (descriptor?.resolveOn === "ilike") {
          return Promise.resolve(descriptor.result);
        }
        return chain;
      }),
      in: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "in", args });
        return chain;
      }),
      order: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "order", args });
        if (descriptor?.resolveOn === "order") {
          return Promise.resolve(descriptor.result);
        }
        return chain;
      }),
    };

    return chain;
  });

  return {
    supabase: { from },
    calls,
    pending,
  };
}

describe("loadChartFallbackHistory", () => {
  it("scopes the raw fallback history to the focused matchup before assembling chart source rows", async () => {
    const { supabase, calls, pending } = createSupabaseMock([
      {
        table: "game_participants",
        resolveOn: "eq",
        result: {
          data: [{ game_id: "game-1" }, { game_id: "game-2" }],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "eq",
        result: {
          data: [{ game_id: "game-2" }, { game_id: "game-3" }],
          error: null,
        },
      },
      {
        table: "games",
        resolveOn: "order",
        result: {
          data: [
            {
              id: "game-2",
              host_profile_id: "focus-player",
              group_id: "group-1",
              group_name_snapshot: "Crew One",
              created_at: "2026-07-05T00:00:00.000Z",
              winner_profile_id: "focus-player",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "order",
        result: {
          data: [
            {
              game_id: "game-2",
              id: "participant-focus",
              profile_id: "focus-player",
              player_name_snapshot: "Focus",
              display_name_snapshot: "Focus",
              color_snapshot: "#ffffff",
              assigned_card_art_index_snapshot: 1,
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 3,
              score: 15,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
            {
              game_id: "game-2",
              id: "participant-compare",
              profile_id: "compare-player",
              player_name_snapshot: "Compare",
              display_name_snapshot: "Compare",
              color_snapshot: "#00ffff",
              assigned_card_art_index_snapshot: 2,
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
          error: null,
        },
      },
      {
        table: "game_rounds",
        resolveOn: "order",
        result: {
          data: [
            {
              game_id: "game-2",
              participant_id: "participant-focus",
              round_index: 0,
              prestige: 7,
              contracts: 1,
              failures: 0,
              assist_recipients: {},
              assist_prestige_recipients: {},
              objective_count: 1,
              objective_prestige: 2,
              created_at: "2026-07-05T00:00:00.000Z",
            },
          ],
          error: null,
        },
      },
    ]);

    const history = await loadChartFallbackHistory({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
    });

    expect(history.games).toHaveLength(1);
    expect(history.games[0]?.id).toBe("game-2");
    expect(history.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "focus-player", name: "Focus" }),
        expect.objectContaining({ id: "compare-player", name: "Compare" }),
      ]),
    );
    expect(
      calls.find(
        (call) => call.table === "games" && call.method === "in",
      )?.args,
    ).toEqual(["id", ["game-2"]]);
    expect(pending).toHaveLength(0);
  });

  it("falls back to the authenticated player id when the route has not selected a focus player", async () => {
    const { supabase, calls } = createSupabaseMock([
      {
        table: "game_participants",
        resolveOn: "eq",
        result: {
          data: [{ game_id: "game-9" }],
          error: null,
        },
      },
      {
        table: "games",
        resolveOn: "order",
        result: {
          data: [
            {
              id: "game-9",
              host_profile_id: "viewer-profile",
              group_id: null,
              group_name_snapshot: null,
              created_at: "2026-07-05T00:00:00.000Z",
              winner_profile_id: "viewer-profile",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "order",
        result: {
          data: [
            {
              game_id: "game-9",
              id: "participant-viewer",
              profile_id: "viewer-profile",
              player_name_snapshot: "Viewer",
              display_name_snapshot: "Viewer",
              color_snapshot: "#ffaa00",
              assigned_card_art_index_snapshot: 0,
              start_order: 0,
              total_prestige: 11,
              direct_prestige: 6,
              assist_prestige_received: 2,
              objective_prestige: 3,
              score: 11,
              assists: 1,
              failures: 1,
              contracts: 2,
              is_winner: true,
            },
          ],
          error: null,
        },
      },
      {
        table: "game_rounds",
        resolveOn: "order",
        result: {
          data: [],
          error: null,
        },
      },
    ]);

    const history = await loadChartFallbackHistory({
      supabase,
      userId: "viewer-profile",
    });

    expect(history.games).toHaveLength(1);
    expect(history.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "viewer-profile", name: "Viewer" }),
      ]),
    );
    expect(
      calls.find(
        (call) => call.table === "game_participants" && call.method === "eq",
      )?.args,
    ).toEqual(["profile_id", "viewer-profile"]);
  });

  it("falls back to legacy participant snapshot names when the focused profile has no linked participant ids yet", async () => {
    const { supabase, calls, pending } = createSupabaseMock([
      {
        table: "game_participants",
        resolveOn: "eq",
        result: {
          data: [],
          error: null,
        },
      },
      {
        table: "profiles",
        resolveOn: "eq",
        result: {
          data: [
            {
              id: "focus-player",
              player_name: "Fochizzy",
              display_name: "Fochizzy",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "ilike",
        result: {
          data: [
            {
              game_id: "legacy-game-1",
              player_name_snapshot: "Fochizzy",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "ilike",
        result: {
          data: [],
          error: null,
        },
      },
      {
        table: "games",
        resolveOn: "order",
        result: {
          data: [
            {
              id: "legacy-game-1",
              host_profile_id: "viewer-profile",
              group_id: "group-1",
              group_name_snapshot: "Crew One",
              created_at: "2026-07-05T00:00:00.000Z",
              winner_profile_id: null,
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "order",
        result: {
          data: [
            {
              game_id: "legacy-game-1",
              id: "legacy-participant",
              profile_id: null,
              player_name_snapshot: "Fochizzy",
              display_name_snapshot: "Fochizzy",
              color_snapshot: "#ffffff",
              assigned_card_art_index_snapshot: 1,
              start_order: 0,
              total_prestige: 15,
              direct_prestige: 8,
              assist_prestige_received: 4,
              objective_prestige: 3,
              score: 15,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          error: null,
        },
      },
      {
        table: "game_rounds",
        resolveOn: "order",
        result: {
          data: [],
          error: null,
        },
      },
    ]);

    const history = await loadChartFallbackHistory({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
    });

    expect(history.games).toHaveLength(1);
    expect(history.games[0]?.id).toBe("legacy-game-1");
    expect(history.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "legacy-fochizzy", name: "Fochizzy" }),
      ]),
    );
    expect(
      calls.filter(
        (call) => call.table === "game_participants" && call.method === "ilike",
      ).map((call) => call.args),
    ).toEqual([
      ["player_name_snapshot", "%Fochizzy%"],
      ["display_name_snapshot", "%Fochizzy%"],
    ]);
    expect(pending).toHaveLength(0);
  });

  it("matches legacy-prefixed snapshot names with a broader case-insensitive pattern before normalizing the player history", async () => {
    const { supabase, calls, pending } = createSupabaseMock([
      {
        table: "game_participants",
        resolveOn: "eq",
        result: {
          data: [],
          error: null,
        },
      },
      {
        table: "profiles",
        resolveOn: "eq",
        result: {
          data: [
            {
              id: "focus-player",
              player_name: "Fochizzy",
              display_name: "Fochizzy",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "ilike",
        result: {
          data: [
            {
              game_id: "legacy-game-2",
              player_name_snapshot: "Legacy Fochizzy",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "ilike",
        result: {
          data: [],
          error: null,
        },
      },
      {
        table: "games",
        resolveOn: "order",
        result: {
          data: [
            {
              id: "legacy-game-2",
              host_profile_id: "viewer-profile",
              group_id: "group-1",
              group_name_snapshot: "Crew One",
              created_at: "2026-07-05T00:00:00.000Z",
              winner_profile_id: null,
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "order",
        result: {
          data: [
            {
              game_id: "legacy-game-2",
              id: "legacy-participant-2",
              profile_id: null,
              player_name_snapshot: "Legacy Fochizzy",
              display_name_snapshot: "Legacy Fochizzy",
              color_snapshot: "#ffffff",
              assigned_card_art_index_snapshot: 1,
              start_order: 0,
              total_prestige: 13,
              direct_prestige: 7,
              assist_prestige_received: 3,
              objective_prestige: 3,
              score: 13,
              assists: 2,
              failures: 1,
              contracts: 3,
              is_winner: true,
            },
          ],
          error: null,
        },
      },
      {
        table: "game_rounds",
        resolveOn: "order",
        result: {
          data: [],
          error: null,
        },
      },
    ]);

    const history = await loadChartFallbackHistory({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
    });

    expect(history.games).toHaveLength(1);
    expect(history.games[0]?.id).toBe("legacy-game-2");
    expect(history.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "legacy-legacy fochizzy",
          name: "Legacy Fochizzy",
        }),
      ]),
    );
    expect(
      calls.filter(
        (call) => call.table === "game_participants" && call.method === "ilike",
      ).map((call) => call.args),
    ).toEqual([
      ["player_name_snapshot", "%Fochizzy%"],
      ["display_name_snapshot", "%Fochizzy%"],
    ]);
    expect(pending).toHaveLength(0);
  });

  it("unions linked participant ids with legacy snapshot-name matches so finished legacy games are not dropped when linked rows also exist", async () => {
    const { supabase, calls, pending } = createSupabaseMock([
      {
        table: "game_participants",
        resolveOn: "eq",
        result: {
          data: [{ game_id: "draft-game-1" }],
          error: null,
        },
      },
      {
        table: "games",
        resolveOn: "order",
        result: {
          data: [],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "eq",
        result: {
          data: [{ game_id: "draft-game-1" }],
          error: null,
        },
      },
      {
        table: "profiles",
        resolveOn: "eq",
        result: {
          data: [
            {
              id: "focus-player",
              player_name: "GregMTG",
              display_name: "GregMTG",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "ilike",
        result: {
          data: [
            {
              game_id: "legacy-game-3",
              player_name_snapshot: "Legacy GregMTG",
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "ilike",
        result: {
          data: [],
          error: null,
        },
      },
      {
        table: "games",
        resolveOn: "order",
        result: {
          data: [
            {
              id: "legacy-game-3",
              host_profile_id: "viewer-profile",
              group_id: "group-1",
              group_name_snapshot: "Crew One",
              created_at: "2026-07-05T00:00:00.000Z",
              winner_profile_id: null,
            },
          ],
          error: null,
        },
      },
      {
        table: "game_participants",
        resolveOn: "order",
        result: {
          data: [
            {
              game_id: "legacy-game-3",
              id: "legacy-participant-3",
              profile_id: null,
              player_name_snapshot: "Legacy GregMTG",
              display_name_snapshot: "Legacy GregMTG",
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
          error: null,
        },
      },
      {
        table: "game_rounds",
        resolveOn: "order",
        result: {
          data: [],
          error: null,
        },
      },
    ]);

    const history = await loadChartFallbackHistory({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
    });

    expect(history.games).toHaveLength(1);
    expect(history.games[0]?.id).toBe("legacy-game-3");
    expect(history.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "legacy-legacy gregmtg",
          name: "Legacy GregMTG",
        }),
      ]),
    );
    expect(
      calls.filter(
        (call) => call.table === "game_participants" && call.method === "ilike",
      ).map((call) => call.args),
    ).toEqual([
      ["player_name_snapshot", "%GregMTG%"],
      ["display_name_snapshot", "%GregMTG%"],
    ]);
    expect(
      calls.filter(
        (call) => call.table === "games" && call.method === "in",
      ).map((call) => call.args),
    ).toEqual([
      ["id", ["draft-game-1"]],
      ["id", ["draft-game-1", "legacy-game-3"]],
    ]);
    expect(pending).toHaveLength(0);
  });
});
