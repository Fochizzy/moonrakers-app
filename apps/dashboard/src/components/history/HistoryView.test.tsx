import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { HistoryRow } from "@/lib/history/historyRows";

import { HistoryView } from "./HistoryView";

const ROWS: HistoryRow[] = [
  {
    createdAt: 1_000,
    groupName: "Crew",
    id: "g-old",
    includesSignedInPlayer: true,
    margin: 3,
    ordinal: 1,
    players: [
      { color: "#f00", id: "p1", isWinner: true, name: "Alix", totalPrestige: 31 },
      { color: null, id: "p2", isWinner: false, name: "Bo", totalPrestige: 22 },
    ],
    roundCount: 6,
    winnerName: "Alix",
    winnerPrestige: 31,
  },
  {
    createdAt: 9_000,
    groupName: null,
    id: "g-new",
    includesSignedInPlayer: false,
    margin: 3,
    ordinal: 2,
    players: [
      { color: null, id: "p2", isWinner: true, name: "Bo", totalPrestige: 40 },
      { color: null, id: "p3", isWinner: false, name: "Cy", totalPrestige: 12 },
    ],
    roundCount: 9,
    winnerName: "Bo",
    winnerPrestige: 40,
  },
];

describe("HistoryView", () => {
  it("lists archived games newest first with links into both game reads", () => {
    render(<HistoryView focusGameId={null} rows={ROWS} />);

    expect(screen.getByText("Bo won with 40")).toBeInTheDocument();
    expect(screen.getByText("Alix won with 31")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Summary" }).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual(["/summary/g-new", "/summary/g-old"]);
    expect(
      screen.getAllByRole("link", { name: "Trends" }).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual(["/game-trends/g-new", "/game-trends/g-old"]);
  });

  it("narrows to grouped games under the Groups filter", async () => {
    const user = userEvent.setup();
    render(<HistoryView focusGameId={null} rows={ROWS} />);

    await user.click(screen.getByRole("button", { name: "Groups" }));

    expect(screen.getByText("Alix won with 31")).toBeInTheDocument();
    expect(screen.queryByText("Bo won with 40")).not.toBeInTheDocument();
  });

  it("narrows to the signed-in player's games under Include Me", async () => {
    const user = userEvent.setup();
    render(<HistoryView focusGameId={null} rows={ROWS} />);

    await user.click(screen.getByRole("button", { name: "Include Me" }));

    expect(screen.getByText("Alix won with 31")).toBeInTheDocument();
    expect(screen.queryByText("Bo won with 40")).not.toBeInTheDocument();
  });

  it("searches participants and reports when nothing matches", async () => {
    const user = userEvent.setup();
    render(<HistoryView focusGameId={null} rows={ROWS} />);

    const search = screen.getByRole("searchbox");
    await user.type(search, "cy");
    expect(screen.getByText("Bo won with 40")).toBeInTheDocument();
    expect(screen.queryByText("Alix won with 31")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "zzzz");
    expect(screen.getByText("No games match")).toBeInTheDocument();
  });

  it("shows the archive empty state when nothing is saved", () => {
    render(<HistoryView focusGameId={null} rows={[]} />);

    expect(screen.getByText("Mission archive is empty")).toBeInTheDocument();
  });
});
