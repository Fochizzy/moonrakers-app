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

    expect(screen.getByRole("tab", { name: /correlations/i })).toBeInTheDocument();
    expect(screen.getByText(/Assist density/i)).toBeInTheDocument();
  });
});
