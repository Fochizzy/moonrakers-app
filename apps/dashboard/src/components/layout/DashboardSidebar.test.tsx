import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardSidebar } from "./DashboardSidebar";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: () => new URLSearchParams(),
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
});
