import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireDashboardAccessMock,
  createAnalyticsRpcClientMock,
  getAnalyticsHomeMock,
  getEloScreenMock,
  loadGameArchiveWithClientMock,
} = vi.hoisted(() => ({
  requireDashboardAccessMock: vi.fn(),
  createAnalyticsRpcClientMock: vi.fn(),
  getAnalyticsHomeMock: vi.fn(),
  getEloScreenMock: vi.fn(),
  loadGameArchiveWithClientMock: vi.fn(),
}));

vi.mock("../auth/serverAccess", () => ({
  requireDashboardAccess: requireDashboardAccessMock,
}));

vi.mock("./rpcClient", () => ({
  createAnalyticsRpcClient: createAnalyticsRpcClientMock,
}));

vi.mock("./loadGameArchive", () => ({
  loadGameArchiveWithClient: loadGameArchiveWithClientMock,
}));

vi.mock("@moonrakers/analytics-contract", () => ({
  getAnalyticsHome: getAnalyticsHomeMock,
  getEloScreen: getEloScreenMock,
}));

import { loadDashboardHome } from "./loadDashboardHome";

/** Minimal stand-in for the `profiles` lookup the focus branch performs. */
function createSupabase(focusProfile: Record<string, unknown> | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: focusProfile, error: null })),
        })),
      })),
    })),
  };
}

describe("loadDashboardHome", () => {
  const client = { rpc: vi.fn() };

  beforeEach(() => {
    requireDashboardAccessMock.mockReset();
    createAnalyticsRpcClientMock.mockReset();
    getAnalyticsHomeMock.mockReset();
    getEloScreenMock.mockReset();
    loadGameArchiveWithClientMock.mockReset();

    createAnalyticsRpcClientMock.mockReturnValue(client);
    getAnalyticsHomeMock.mockResolvedValue({
      generatedAt: "2026-08-16T00:00:00.000Z",
      hero: { players: 4, games: 12, views: 0 },
      cards: [],
    });
    getEloScreenMock.mockResolvedValue({ leaderboardRows: [], summary: null });
    loadGameArchiveWithClientMock.mockResolvedValue({ games: [] });
  });

  it("keeps profileId on the authenticated user while focusing someone else", async () => {
    requireDashboardAccessMock.mockResolvedValue({
      supabase: createSupabase({
        id: "focused-player-id",
        player_name: "Corey",
        display_name: "Corey",
      }),
      userId: "viewer-profile-id",
      profile: { id: "viewer-profile-id", player_name: "Fochizzy" },
    });

    const result = await loadDashboardHome({
      focusPlayerId: "focused-player-id",
    });

    // Sending the focused player as profile_id is what made the RPC raise
    // "profile_id must match the authenticated profile" and blank the route.
    expect(getAnalyticsHomeMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: "focused-player-id",
    });
    expect(result.focusPlayerId).toBe("focused-player-id");
    expect(result.focusProfileName).toBe("Corey");
  });

  it("falls back to the signed-in profile when no focus player is selected", async () => {
    requireDashboardAccessMock.mockResolvedValue({
      supabase: createSupabase(null),
      userId: "viewer-profile-id",
      profile: { id: "viewer-profile-id", player_name: "Fochizzy" },
    });

    await loadDashboardHome();

    expect(getAnalyticsHomeMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: null,
    });
  });

  it("ignores a blank focusPlayerId in the query string", async () => {
    requireDashboardAccessMock.mockResolvedValue({
      supabase: createSupabase(null),
      userId: "viewer-profile-id",
      profile: { id: "viewer-profile-id", player_name: "Fochizzy" },
    });

    const result = await loadDashboardHome({ focusPlayerId: "" });

    expect(getAnalyticsHomeMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: null,
    });
    expect(result.focusPlayerId).toBe("viewer-profile-id");
  });
});
