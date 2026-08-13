import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireDashboardAccessMock,
  createAnalyticsRpcClientMock,
  getInsightsScreenMock,
} = vi.hoisted(() => ({
  requireDashboardAccessMock: vi.fn(),
  createAnalyticsRpcClientMock: vi.fn(),
  getInsightsScreenMock: vi.fn(),
}));

vi.mock("../auth/serverAccess", () => ({
  requireDashboardAccess: requireDashboardAccessMock,
}));

vi.mock("./rpcClient", () => ({
  createAnalyticsRpcClient: createAnalyticsRpcClientMock,
}));

vi.mock("@moonrakers/analytics-contract", () => ({
  getInsightsScreen: getInsightsScreenMock,
}));

import { loadInsightsScreen } from "./loadInsightsScreen";

describe("loadInsightsScreen", () => {
  beforeEach(() => {
    requireDashboardAccessMock.mockReset();
    createAnalyticsRpcClientMock.mockReset();
    getInsightsScreenMock.mockReset();
  });

  it("prefers the selected focus player for insights when one is present in the URL", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };
    const payload = {
      generatedAt: "2026-07-05T00:00:00.000Z",
      meta: { games: 3 },
      cards: [],
      topSignals: [],
      relationships: {},
      correlations: {},
    };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile-id",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getInsightsScreenMock.mockResolvedValue(payload);

    await loadInsightsScreen({ focusPlayerId: "focused-player-id" });

    expect(getInsightsScreenMock).toHaveBeenCalledWith(client, {
      profileId: "focused-player-id",
    });
  });

  it("falls back to the authenticated profile id when no focus player is selected", async () => {
    const supabase = { from: vi.fn() };
    const client = { rpc: vi.fn() };
    const payload = {
      generatedAt: "2026-07-05T00:00:00.000Z",
      meta: { games: 1 },
      cards: [],
      topSignals: [],
      relationships: {},
      correlations: {},
    };

    requireDashboardAccessMock.mockResolvedValue({
      supabase,
      userId: "viewer-profile-id",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getInsightsScreenMock.mockResolvedValue(payload);

    await loadInsightsScreen();

    expect(getInsightsScreenMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
    });
  });
});
