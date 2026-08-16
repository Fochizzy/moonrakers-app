import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireDashboardAccessMock,
  createAnalyticsRpcClientMock,
  getEloScreenMock,
} = vi.hoisted(() => ({
  requireDashboardAccessMock: vi.fn(),
  createAnalyticsRpcClientMock: vi.fn(),
  getEloScreenMock: vi.fn(),
}));

vi.mock("../auth/serverAccess", () => ({
  requireDashboardAccess: requireDashboardAccessMock,
}));

vi.mock("./rpcClient", () => ({
  createAnalyticsRpcClient: createAnalyticsRpcClientMock,
}));

vi.mock("@moonrakers/analytics-contract", () => ({
  getEloScreen: getEloScreenMock,
}));

import { loadEloScreen } from "./loadEloScreen";

describe("loadEloScreen", () => {
  const client = { rpc: vi.fn() };

  beforeEach(() => {
    requireDashboardAccessMock.mockReset();
    createAnalyticsRpcClientMock.mockReset();
    getEloScreenMock.mockReset();

    requireDashboardAccessMock.mockResolvedValue({
      supabase: { from: vi.fn() },
      userId: "viewer-profile-id",
    });
    createAnalyticsRpcClientMock.mockReturnValue(client);
    getEloScreenMock.mockResolvedValue({ leaderboardRows: [] });
  });

  it("always reads as the authenticated profile and passes the focus separately", async () => {
    await loadEloScreen({
      focusPlayerId: "focused-player-id",
      opponentId: "rival-player-id",
      sortKey: "wins",
    });

    expect(getEloScreenMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: "focused-player-id",
      opponentId: "rival-player-id",
      sortKey: "wins",
    });
  });

  it("drops the blank filters the in-page form submits instead of casting them to uuid", async () => {
    // `?opponentId=&sortKey=elo` is what the ELO toolbar produces for "Any
    // rival"; forwarding "" made Postgres fail the whole call on the cast.
    await loadEloScreen({
      focusPlayerId: "focused-player-id",
      opponentId: "",
      sortKey: "elo",
    });

    expect(getEloScreenMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: "focused-player-id",
      opponentId: null,
      sortKey: "elo",
    });
  });

  it("treats the literal none sentinel as no filter", async () => {
    await loadEloScreen({
      focusPlayerId: "none",
      opponentId: "none",
      sortKey: "  ",
    });

    expect(getEloScreenMock).toHaveBeenCalledWith(client, {
      profileId: "viewer-profile-id",
      focusPlayerId: null,
      opponentId: null,
      sortKey: null,
    });
  });
});
