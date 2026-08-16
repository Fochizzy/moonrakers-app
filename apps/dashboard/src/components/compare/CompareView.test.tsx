import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompareView } from "./CompareView";

describe("CompareView", () => {
  it("renders focus and rival selectors and the compare dataset title", () => {
    render(
      <CompareView
        setup={{
          focusPlayerOptions: [{ key: "p1", label: "Nova" }],
          comparePlayerOptions: [{ key: "p2", label: "Vex" }],
          defaults: {
            focusPlayerId: "p1",
            comparePlayerId: "p2",
          },
        }}
        dataset={{
          chartKey: "compare",
          generatedAt: "2026-07-05T00:00:00.000Z",
          title: "Compare players",
          subtitle: "Direct side-by-side read",
          data: { rows: [] },
        }}
      />,
    );

    expect(screen.getByLabelText(/focus player/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/compare player/i)).toBeInTheDocument();
    expect(screen.getByText("Nova vs Vex")).toBeInTheDocument();
  });

  it("renders compare rows from source history when the published dataset is still a placeholder", () => {
    render(
      <CompareView
        setup={{
          focusPlayerOptions: [
            { key: "fochizzy", label: "Fochizzy" },
            { key: "corey", label: "Corey" },
          ],
          comparePlayerOptions: [
            { key: "fochizzy", label: "Fochizzy" },
            { key: "corey", label: "Corey" },
          ],
          defaults: {
            focusPlayerId: "fochizzy",
            comparePlayerId: "corey",
            scopedPlayerIds: [],
            metricKey: null,
            lineMode: null,
            eloTab: null,
            opponentId: null,
          },
        }}
        dataset={{
          chartKey: "compare",
          generatedAt: "2026-07-05T00:00:00.000Z",
          title: "Analytics chart",
          subtitle: "Server-authored placeholder dataset.",
          emptyState: {
            title: "No chart data yet",
            subtitle: "The selectors are wired up and waiting for a richer compare dataset from the analytics contract.",
          },
          data: {
            meta: {
              hasData: false,
              pointCount: 0,
            },
            sourcePlayers: [
              { id: "fochizzy", name: "Fochizzy" },
              { id: "corey", name: "Corey" },
            ],
            sourceGames: [
              {
                id: "game-1",
                createdAt: 1,
                players: [
                  { id: "fochizzy", name: "Fochizzy" },
                  { id: "corey", name: "Corey" },
                ],
                totals: {
                  fochizzy: {
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
                  corey: {
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
      />,
    );

    expect(screen.getByText("Shared games")).toBeInTheDocument();
    expect(screen.getByText("Game 1")).toBeInTheDocument();
    expect(screen.queryByText("No chart data yet")).not.toBeInTheDocument();
  });

  it("computes the per-game gap the published dataset never carried", () => {
    render(
      <CompareView
        setup={{
          focusPlayerOptions: [{ key: "p1", label: "Nova" }],
          comparePlayerOptions: [{ key: "p2", label: "Vex" }],
          defaults: { focusPlayerId: "p1", comparePlayerId: "p2" },
        }}
        dataset={{
          chartKey: "compare",
          generatedAt: "2026-07-05T00:00:00.000Z",
          title: "Compare players",
          subtitle: "Direct side-by-side read",
          data: {
            metricKey: "score",
            meta: { hasData: true, pointCount: 2 },
            rows: [
              { label: "Game 1", focusValue: 47, compareValue: 21 },
              { label: "Game 2", focusValue: 30, compareValue: 54 },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("+26")).toBeInTheDocument();
    expect(screen.getByText("-24")).toBeInTheDocument();
    expect(screen.queryByText(/No delta/i)).not.toBeInTheDocument();
  });

  it("leads with the head-to-head aggregate rather than eleven bare cards", () => {
    render(
      <CompareView
        setup={{
          focusPlayerOptions: [{ key: "p1", label: "Nova" }],
          comparePlayerOptions: [{ key: "p2", label: "Vex" }],
          defaults: { focusPlayerId: "p1", comparePlayerId: "p2" },
        }}
        dataset={{
          chartKey: "compare",
          generatedAt: "2026-07-05T00:00:00.000Z",
          data: {
            metricKey: "score",
            meta: { hasData: true, pointCount: 3 },
            rows: [
              { label: "Game 1", focusValue: 10, compareValue: 4 },
              { label: "Game 2", focusValue: 6, compareValue: 9 },
              { label: "Game 3", focusValue: 8, compareValue: 2 },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Games led")).toBeInTheDocument();
    expect(screen.getByText("2–1")).toBeInTheDocument();
    expect(
      screen.getByText(/Nova leads 2 of 3 shared games on score/i),
    ).toBeInTheDocument();
  });
});
