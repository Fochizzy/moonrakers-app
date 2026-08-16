import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireDashboardAccessMock,
  createAnalyticsRpcClientMock,
  getPlayerProfileScreenMock,
} = vi.hoisted(() => ({
  requireDashboardAccessMock: vi.fn(),
  createAnalyticsRpcClientMock: vi.fn(),
  getPlayerProfileScreenMock: vi.fn(),
}));

vi.mock("../auth/serverAccess", () => ({
  requireDashboardAccess: requireDashboardAccessMock,
}));

vi.mock("./rpcClient", () => ({
  createAnalyticsRpcClient: createAnalyticsRpcClientMock,
}));

vi.mock("@moonrakers/analytics-contract", () => ({
  getPlayerProfileScreen: getPlayerProfileScreenMock,
}));

import { loadProfileScreen } from "./loadProfileScreen";

describe("loadProfileScreen", () => {
  const client = { rpc: vi.fn() };

  beforeEach(() => {
    requireDashboardAccessMock.mockReset();
    createAnalyticsRpcClientMock.mockReset();
    getPlayerProfileScreenMock.mockReset();

    requireDashboardAccessMock.mockResolvedValue({
      supabase: { from: vi.fn() },
      userId: "viewer-profile-id",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getPlayerProfileScreenMock.mockResolvedValue({ hero: {} });
  });

  it("reads as the authenticated profile with the requested player in focus", async () => {
    await loadProfileScreen({
      focusPlayerId: "focused-player-id",
      opponentId: "rival-player-id",
    });

    expect(getPlayerProfileScreenMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: "focused-player-id",
      opponentId: "rival-player-id",
    });
  });

  it("nulls out blank query-string filters rather than sending them as uuids", async () => {
    await loadProfileScreen({ focusPlayerId: "", opponentId: "" });

    expect(getPlayerProfileScreenMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: null,
      opponentId: null,
    });
  });
});
