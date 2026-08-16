import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartDetailView } from "./ChartDetailView";

const baseSetup = {
  chartKey: "compare",
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

describe("ChartDetailView", () => {
  it("renders the chart when the payload reports data even if emptyState copy is present", () => {
    render(
      <ChartDetailView
        chartKey="compare"
        dataset={{
          chartKey: "compare",
          generatedAt: "2026-07-05T00:00:00.000Z",
          title: "Compare players",
          emptyState: {
            title: "No chart data yet",
            subtitle: "This copy should not hide a populated chart.",
          },
          data: {
            meta: {
              hasData: true,
              pointCount: 1,
            },
            rows: [{ label: "Prestige", focusValue: 12, compareValue: 9 }],
          },
        }}
        setup={baseSetup}
      />,
    );

    expect(screen.getByText("Comparison Family")).toBeInTheDocument();
    expect(screen.queryByText("No chart data yet")).not.toBeInTheDocument();
  });

  it("shows the empty state when the payload reports no renderable data", () => {
    render(
      <ChartDetailView
        chartKey="compare"
        dataset={{
          chartKey: "compare",
          generatedAt: "2026-07-05T00:00:00.000Z",
          title: "Compare players",
          emptyState: {
            title: "No chart data yet",
            subtitle: "No rows are available.",
          },
          data: {
            meta: {
              hasData: false,
              pointCount: 0,
            },
            rows: [],
          },
        }}
        setup={baseSetup}
      />,
    );

    expect(screen.getByText("No chart data yet")).toBeInTheDocument();
    expect(screen.getByText("No rows are available.")).toBeInTheDocument();
  });

  it("builds a chart from source history and keeps the selector synced to the active focus player", () => {
    render(
      <ChartDetailView
        chartKey="radar"
        controls={{
          ...baseSetup.defaults,
          focusPlayerId: "corey",
          comparePlayerId: "fochizzy",
        }}
        dataset={{
          chartKey: "radar",
          generatedAt: "2026-07-05T00:00:00.000Z",
          title: "Analytics chart",
          subtitle: "Server-authored placeholder dataset.",
          emptyState: {
            title: "No chart data yet",
            subtitle: "No radar rows are available.",
          },
          data: {
            meta: {
              hasData: false,
              pointCount: 0,
              focusPlayerId: "corey",
              comparePlayerId: "fochizzy",
            },
            sourcePlayers: [
              { id: "corey", name: "Corey" },
              { id: "fochizzy", name: "Fochizzy" },
            ],
            sourceGames: [
              {
                id: "game-1",
                createdAt: 1,
                players: [
                  { id: "corey", name: "Corey" },
                  { id: "fochizzy", name: "Fochizzy" },
                ],
                totals: {
                  corey: {
                    score: 16,
                    totalPrestige: 16,
                    directPrestige: 7,
                    assistPrestigeReceived: 4,
                    objectivePrestige: 5,
                    assists: 2,
                    failures: 1,
                    contracts: 3,
                    turns: 6,
                  },
                  fochizzy: {
                    score: 12,
                    totalPrestige: 12,
                    directPrestige: 5,
                    assistPrestigeReceived: 3,
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
          },
        }}
        setup={{
          ...baseSetup,
          focusPlayerOptions: [
            { key: "corey", label: "Corey" },
            { key: "fochizzy", label: "Fochizzy" },
          ],
          comparePlayerOptions: [
            { key: "corey", label: "Corey" },
            { key: "fochizzy", label: "Fochizzy" },
          ],
          defaults: {
            ...baseSetup.defaults,
            focusPlayerId: "fochizzy",
          },
        }}
      />,
    );

    expect(screen.getByText("Radar")).toBeInTheDocument();
    expect(screen.getByText("Trait profile from tracked games.")).toBeInTheDocument();
    expect(screen.getByText("Radar Profile")).toBeInTheDocument();
    expect(screen.queryByText("No chart data yet")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /focus player/i })).toHaveValue(
      "corey",
    );
  });

  it("submits the opponent none sentinel as an empty query value instead of the literal none string", () => {
    render(
      <ChartDetailView
        chartKey="elo"
        dataset={{
          chartKey: "elo",
          generatedAt: "2026-07-05T00:00:00.000Z",
          title: "Elo trend",
          data: {
            meta: {
              hasData: false,
              pointCount: 0,
            },
          },
        }}
        setup={{
          ...baseSetup,
          focusPlayerOptions: [{ key: "focus-player", label: "Fochizzy" }],
          opponentOptions: [
            { key: "none", label: "None" },
            { key: "rival-player", label: "Corey" },
          ],
          defaults: {
            ...baseSetup.defaults,
            focusPlayerId: "focus-player",
            opponentId: null,
          },
        }}
      />,
    );

    expect(screen.getByRole("combobox", { name: /opponent/i })).toHaveValue("");
  });
});
