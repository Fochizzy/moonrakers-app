import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatsView } from "./StatsView";

describe("StatsView", () => {
  it("keeps correlations visible as a first-class stats tab", () => {
    render(
      <StatsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          overview: {
            hero: { players: 4, games: 10, takeaway: "Nova leads" },
            cards: [],
            topSignals: [],
          },
          players: { options: [], selectedPlayerId: null, detail: null },
          playstyle: {},
          correlations: { entries: [{ key: "assist", label: "Assist density" }] },
          games: {},
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /correlations/i })).toBeInTheDocument();
    expect(screen.getByText(/Assist density/i)).toBeInTheDocument();
  });

  it("renders published game summary rows from payload.games.items", () => {
    render(
      <StatsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          overview: {
            hero: { players: 4, games: 10, takeaway: "Nova leads" },
            cards: [],
            topSignals: [],
          },
          players: { options: [], selectedPlayerId: null, detail: null },
          playstyle: {},
          correlations: {},
          games: {
            items: [
              {
                key: "latest",
                label: "Latest tracked game",
                value: "Won the last logged table on July 4.",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText(/Latest tracked game/i)).toBeInTheDocument();
    expect(screen.getByText(/Won the last logged table on July 4\./i)).toBeInTheDocument();
    expect(screen.queryByText(/No game summaries returned/i)).not.toBeInTheDocument();
  });
});
