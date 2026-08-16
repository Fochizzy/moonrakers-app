import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardSidebar } from "./DashboardSidebar";

const { usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/"),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

describe("DashboardSidebar", () => {
  it("links every companion surface the app exposes", () => {
    usePathnameMock.mockReturnValue("/");
    render(<DashboardSidebar />);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toEqual([
      "/",
      "/analytics",
      "/history",
      "/compare",
      "/stats",
      "/charts",
      "/insights",
      "/elo",
      "/players",
      "/player-profile",
      "/player-cards",
      "/profile",
      "/definitions",
    ]);
  });

  it("marks nested routes active without also lighting up Home", () => {
    usePathnameMock.mockReturnValue("/summary/game-1");
    render(<DashboardSidebar />);

    expect(
      screen.queryByRole("link", { current: "page" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Profile and Profiles from matching each other", () => {
    usePathnameMock.mockReturnValue("/player-profile/p1");
    render(<DashboardSidebar />);

    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
      "href",
      "/player-profile",
    );
  });

  it("carries the focus player only to routes that read it", () => {
    usePathnameMock.mockReturnValue("/");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({ focusPlayerId: "p1" }),
    );
    render(<DashboardSidebar />);

    const hrefFor = (label: string) =>
      screen.getByRole("link", { name: label }).getAttribute("href");

    expect(hrefFor("Stats")).toBe("/stats?focusPlayerId=p1");
    expect(hrefFor("Player Cards")).toBe("/player-cards?focusPlayerId=p1");
    // History and Definitions ignore the parameter, so it is not appended.
    expect(hrefFor("History")).toBe("/history");
    expect(hrefFor("Definitions")).toBe("/definitions");

    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });
});
