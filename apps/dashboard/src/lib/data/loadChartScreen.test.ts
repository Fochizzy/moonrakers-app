import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireDashboardAccessMock,
  createAnalyticsRpcClientMock,
  getChartSetupMock,
  getChartDatasetMock,
  loadChartFallbackHistoryMock,
} = vi.hoisted(() => ({
  requireDashboardAccessMock: vi.fn(),
  createAnalyticsRpcClientMock: vi.fn(),
  getChartSetupMock: vi.fn(),
  getChartDatasetMock: vi.fn(),
  loadChartFallbackHistoryMock: vi.fn(),
}));

vi.mock("../auth/serverAccess", () => ({
  requireDashboardAccess: requireDashboardAccessMock,
}));

vi.mock("./rpcClient", () => ({
  createAnalyticsRpcClient: createAnalyticsRpcClientMock,
}));

vi.mock("@moonrakers/analytics-contract", () => ({
  getChartSetup: getChartSetupMock,
  getChartDataset: getChartDatasetMock,
}));

vi.mock("./loadChartFallbackHistory", () => ({
  loadChartFallbackHistory: loadChartFallbackHistoryMock,
}));

import { loadChartScreen } from "./loadChartScreen";

const baseSetup = {
  chartKey: "radar",
  generatedAt: "2026-07-05T00:00:00.000Z",
  focusPlayerOptions: [],
  comparePlayerOptions: [],
  scopePlayerOptions: [],
  metricOptions: [],
  lineModeOptions: [],
  eloViewOptions: [],
  opponentOptions: [],
  defaults: {
    focusPlayerId: null,
    comparePlayerId: null,
    scopedPlayerIds: [],
    metricKey: null,
    lineMode: null,
    eloTab: null,
    opponentId: null,
  },
};

describe("loadChartScreen", () => {
  beforeEach(() => {
    requireDashboardAccessMock.mockReset();
    createAnalyticsRpcClientMock.mockReset();
    getChartSetupMock.mockReset();
    getChartDatasetMock.mockReset();
    loadChartFallbackHistoryMock.mockReset();
  });

  it("passes the active chart controls into the raw history fallback and merges the returned source rows", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue(baseSetup);
    getChartDatasetMock.mockResolvedValue({
      chartKey: "radar",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Analytics chart",
      data: {
        meta: {
          hasData: false,
          pointCount: 0,
        },
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [
        {
          id: "game-1",
          createdAt: 1,
          players: [{ id: "focus-player", name: "Focus" }],
          totals: {
            "focus-player": {
              score: 14,
              totalPrestige: 14,
              directPrestige: 8,
              assistPrestigeReceived: 2,
              objectivePrestige: 4,
              assists: 1,
              failures: 1,
              contracts: 3,
              turns: 6,
            },
          },
          rounds: [],
          timeline: [],
        },
      ],
      players: [{ id: "focus-player", name: "Focus" }],
    });

    const result = await loadChartScreen({
      chartKey: "radar",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
    });

    expect(loadChartFallbackHistoryMock).toHaveBeenCalledWith({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
      opponentId: null,
      scopedPlayerIds: [],
    });
    expect(result.dataset.data.sourceGames).toEqual([
      expect.objectContaining({
        id: "game-1",
        players: expect.arrayContaining([
          expect.objectContaining({ id: "focus-player" }),
        ]),
      }),
    ]);
    expect(result.dataset.data.sourcePlayers).toEqual([
      { id: "focus-player", name: "Focus" },
    ]);
  });

  it("does not reuse setup fallback scope ids when the route did not request a scoped chart", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue({
      ...baseSetup,
      defaults: {
        ...baseSetup.defaults,
        scopedPlayerIds: ["viewer-profile", "focus-player", "teammate", "rival"],
      },
    });
    getChartDatasetMock.mockResolvedValue({
      chartKey: "radar",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Analytics chart",
      data: {
        meta: {
          hasData: false,
          pointCount: 0,
        },
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [{ id: "game-1" }],
      players: [{ id: "focus-player", name: "Focus" }],
    });

    await loadChartScreen({
      chartKey: "radar",
      focusPlayerId: "focus-player",
    });

    expect(getChartDatasetMock).toHaveBeenCalledWith(client, {
      chartKey: "radar",
      profileId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      scopedPlayerIds: [],
      selectedGameId: null,
      metricKey: null,
      lineMode: null,
      graphMode: null,
      opponentId: null,
    });
    expect(loadChartFallbackHistoryMock).toHaveBeenCalledWith({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      opponentId: null,
      scopedPlayerIds: [],
    });
  });

  it("normalizes sentinel opponent ids before calling the analytics contract", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue(baseSetup);
    getChartDatasetMock.mockResolvedValue({
      chartKey: "elo",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Elo trend",
      data: {
        meta: {
          hasData: false,
          pointCount: 0,
        },
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [{ id: "game-1" }],
      players: [{ id: "focus-player", name: "Focus" }],
    });

    await loadChartScreen({
      chartKey: "elo",
      focusPlayerId: "focus-player",
      opponentId: "none",
    });

    expect(getChartDatasetMock).toHaveBeenCalledWith(client, {
      chartKey: "elo",
      profileId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      scopedPlayerIds: [],
      selectedGameId: null,
      metricKey: null,
      lineMode: null,
      graphMode: null,
      opponentId: null,
    });
    expect(loadChartFallbackHistoryMock).toHaveBeenCalledWith({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      opponentId: null,
      scopedPlayerIds: [],
    });
  });

  it("keeps compare and metric controls available for compare charts", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue({
      ...baseSetup,
      chartKey: "compare",
      focusPlayerOptions: [{ key: "focus-player", label: "Focus" }],
      defaults: {
        ...baseSetup.defaults,
        focusPlayerId: "focus-player",
      },
    });
    getChartDatasetMock.mockResolvedValue({
      chartKey: "compare",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Analytics chart",
      data: {
        meta: {
          hasData: false,
          pointCount: 0,
        },
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [
        {
          id: "game-1",
          createdAt: 1,
          players: [
            { id: "focus-player", name: "Focus" },
            { id: "compare-player", name: "Compare" },
          ],
          totals: {
            "focus-player": {
              score: 15,
              totalPrestige: 15,
              directPrestige: 7,
              assistPrestigeReceived: 3,
              objectivePrestige: 5,
              assists: 2,
              failures: 1,
              contracts: 3,
              turns: 6,
            },
            "compare-player": {
              score: 12,
              totalPrestige: 12,
              directPrestige: 6,
              assistPrestigeReceived: 2,
              objectivePrestige: 4,
              assists: 1,
              failures: 2,
              contracts: 2,
              turns: 6,
            },
          },
          rounds: [],
          timeline: [],
        },
      ],
      players: [
        { id: "focus-player", name: "Focus" },
        { id: "compare-player", name: "Compare" },
      ],
    });

    const result = await loadChartScreen({
      chartKey: "compare",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
      metricKey: "failures",
    });

    expect(getChartDatasetMock).toHaveBeenCalledWith(client, {
      chartKey: "compare",
      profileId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
      scopedPlayerIds: [],
      selectedGameId: null,
      metricKey: "failures",
      lineMode: null,
      graphMode: null,
      opponentId: null,
    });
    expect(loadChartFallbackHistoryMock).toHaveBeenCalledWith({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
      opponentId: null,
      scopedPlayerIds: [],
    });
    expect(result.controls.comparePlayerId).toBe("compare-player");
    expect(result.controls.metricKey).toBe("failures");
    expect(result.setup.comparePlayerOptions).toEqual([
      { key: "compare-player", label: "Compare" },
    ]);
    expect(result.setup.metricOptions).toEqual(
      expect.arrayContaining([
        { key: "score", label: "Score" },
        { key: "totalPrestige", label: "Total Prestige" },
        { key: "failures", label: "Failures" },
      ]),
    );
    expect(result.setup.metricOptions.length).toBeGreaterThan(10);
  });

  it("keeps relationship graph history anchored to the focus player when compare and opponent filters are present", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue(baseSetup);
    getChartDatasetMock.mockResolvedValue({
      chartKey: "relationship_graph",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Relationship graph",
      data: {
        meta: {
          hasData: false,
          pointCount: 0,
        },
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [
        {
          id: "game-1",
          createdAt: 1,
          players: [
            { id: "focus-player", name: "Focus" },
            { id: "assist-player", name: "Assist" },
          ],
          totals: {
            "focus-player": {
              score: 14,
              totalPrestige: 14,
              assistPrestigeBySource: { "assist-player": 3 },
            },
          },
          rounds: [],
          timeline: [],
        },
      ],
      players: [
        { id: "focus-player", name: "Focus" },
        { id: "assist-player", name: "Assist" },
      ],
    });

    const result = await loadChartScreen({
      chartKey: "relationship_graph",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
      opponentId: "opponent-player",
      scopedPlayerIds: ["focus-player", "compare-player", "opponent-player"],
    });

    expect(getChartDatasetMock).toHaveBeenCalledWith(client, {
      chartKey: "relationship_graph",
      profileId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      scopedPlayerIds: [],
      selectedGameId: null,
      metricKey: null,
      lineMode: null,
      graphMode: null,
      opponentId: null,
    });
    expect(loadChartFallbackHistoryMock).toHaveBeenCalledWith({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      opponentId: null,
      scopedPlayerIds: [],
    });
    expect(result.setup.comparePlayerOptions).toEqual([]);
    expect(result.setup.opponentOptions).toEqual([]);
    expect(result.setup.scopePlayerOptions).toEqual([]);
    expect(result.setup.focusPlayerOptions).toEqual([
      { key: "focus-player", label: "Focus" },
      { key: "assist-player", label: "Assist" },
    ]);
  });

  it("ignores compare and opponent filters for the efficiency scatter fallback history", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue({
      ...baseSetup,
      chartKey: "efficiency_failure_scatter",
      defaults: {
        ...baseSetup.defaults,
        comparePlayerId: "compare-player",
        opponentId: "opponent-player",
      },
    });
    getChartDatasetMock.mockResolvedValue({
      chartKey: "efficiency_failure_scatter",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Analytics chart",
      data: {
        meta: {
          hasData: false,
          pointCount: 0,
        },
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [{ id: "game-1" }],
      players: [{ id: "focus-player", name: "Focus" }],
    });

    await loadChartScreen({
      chartKey: "efficiency_failure_scatter",
      focusPlayerId: "focus-player",
      comparePlayerId: "compare-player",
      opponentId: "opponent-player",
    });

    expect(getChartDatasetMock).toHaveBeenCalledWith(client, {
      chartKey: "efficiency_failure_scatter",
      profileId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      scopedPlayerIds: [],
      selectedGameId: null,
      metricKey: null,
      lineMode: null,
      graphMode: null,
      opponentId: null,
    });
    expect(loadChartFallbackHistoryMock).toHaveBeenCalledWith({
      supabase,
      userId: "viewer-profile",
      focusPlayerId: "focus-player",
      comparePlayerId: null,
      opponentId: null,
      scopedPlayerIds: [],
    });
  });

  it("hydrates elo opponent options from fallback source players", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue({
      ...baseSetup,
      chartKey: "elo",
      focusPlayerOptions: [{ key: "focus-player", label: "Corey" }],
      opponentOptions: [{ key: "none", label: "None" }],
      defaults: {
        ...baseSetup.defaults,
        focusPlayerId: "focus-player",
      },
    });
    getChartDatasetMock.mockResolvedValue({
      chartKey: "elo",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Elo trend",
      data: {
        meta: {
          hasData: false,
          pointCount: 0,
        },
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [
        {
          id: "game-1",
          createdAt: 1,
          players: [
            { id: "focus-player", name: "Corey" },
            { id: "rival-player", name: "Fochizzy" },
            { id: "third-player", name: "GregMTG" },
          ],
          totals: {},
          rounds: [],
          timeline: [],
        },
      ],
      players: [
        { id: "focus-player", name: "Corey" },
        { id: "rival-player", name: "Fochizzy" },
        { id: "third-player", name: "GregMTG" },
      ],
    });

    const result = await loadChartScreen({
      chartKey: "elo",
      focusPlayerId: "focus-player",
      opponentId: "none",
    });

    expect(result.setup.opponentOptions).toEqual([
      { key: "none", label: "None" },
      { key: "rival-player", label: "Fochizzy" },
      { key: "third-player", label: "GregMTG" },
    ]);
  });

  it("skips the raw fallback when the published dataset already includes source history", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue(baseSetup);
    getChartDatasetMock.mockResolvedValue({
      chartKey: "radar",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Analytics chart",
      data: {
        sourceGames: [
          {
            id: "game-1",
            createdAt: 1,
            players: [{ id: "focus-player", name: "Focus" }],
            totals: {
              "focus-player": {
                score: 14,
                totalPrestige: 14,
                directPrestige: 8,
                assistPrestigeReceived: 2,
                objectivePrestige: 4,
                assists: 1,
                failures: 1,
                contracts: 3,
                turns: 6,
              },
            },
            rounds: [],
            timeline: [],
          },
        ],
        sourcePlayers: [{ id: "focus-player", name: "Focus" }],
      },
    });

    await loadChartScreen({
      chartKey: "radar",
      focusPlayerId: "focus-player",
    });

    expect(loadChartFallbackHistoryMock).not.toHaveBeenCalled();
  });

  it("replaces placeholder source games with the raw fallback history when the published dataset only provides id stubs", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getChartSetupMock.mockResolvedValue(baseSetup);
    getChartDatasetMock.mockResolvedValue({
      chartKey: "radar",
      generatedAt: "2026-07-05T00:00:00.000Z",
      title: "Analytics chart",
      data: {
        sourceGames: [{ id: "placeholder-game-1" }],
        sourcePlayers: [{ id: "focus-player", name: "Focus" }],
      },
    });
    loadChartFallbackHistoryMock.mockResolvedValue({
      games: [
        {
          id: "game-1",
          createdAt: 1,
          players: [
            { id: "focus-player", name: "Focus" },
            { id: "compare-player", name: "Compare" },
          ],
          totals: {
            "focus-player": {
              score: 14,
              totalPrestige: 14,
              directPrestige: 8,
              assistPrestigeReceived: 2,
              objectivePrestige: 4,
              assists: 1,
              failures: 1,
              contracts: 3,
              turns: 6,
            },
            "compare-player": {
              score: 12,
              totalPrestige: 12,
              directPrestige: 6,
              assistPrestigeReceived: 2,
              objectivePrestige: 4,
              assists: 1,
              failures: 2,
              contracts: 2,
              turns: 6,
            },
          },
          rounds: [],
          timeline: [],
        },
      ],
      players: [
        { id: "focus-player", name: "Focus" },
        { id: "compare-player", name: "Compare" },
      ],
    });

    const result = await loadChartScreen({
      chartKey: "radar",
      focusPlayerId: "focus-player",
    });

    expect(loadChartFallbackHistoryMock).toHaveBeenCalled();
    expect(result.dataset.data.sourceGames).toEqual([
      expect.objectContaining({
        id: "game-1",
        players: expect.arrayContaining([
          expect.objectContaining({ id: "focus-player" }),
        ]),
        totals: expect.objectContaining({
          "focus-player": expect.objectContaining({
            totalPrestige: 14,
          }),
        }),
      }),
    ]);
  });
});
