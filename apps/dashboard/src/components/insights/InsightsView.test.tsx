import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InsightsView } from "./InsightsView";

describe("InsightsView", () => {
  it("renders top signals and the relationship summary", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 10 },
          topSignals: [
            {
              key: "pace",
              label: "Pace",
              value: "0.7 per game",
              strength: "High",
              tone: "accent",
              meaning: "Fast",
            },
          ],
          relationships: { summary: "Nova feeds Vex" },
          correlations: {},
        }}
      />,
    );

    expect(screen.getByText("Pace")).toBeInTheDocument();
    expect(screen.getByText("0.7 per game")).toBeInTheDocument();
    expect(screen.getByText(/Nova feeds Vex/i)).toBeInTheDocument();
  });

  it("renders the rivalry table the server returns", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 18 },
          topSignals: [],
          rivalries: [
            {
              opponentId: "p2",
              opponentName: "GregMTG",
              gamesTogether: 18,
              wins: 1,
              losses: 8,
              draws: 9,
            },
          ],
          correlations: {},
        }}
      />,
    );

    expect(screen.getByText("Rivalries")).toBeInTheDocument();
    expect(screen.getByText("GregMTG")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("renders assist network nodes and lanes with resolved player names", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 18 },
          topSignals: [],
          assistNetwork: {
            nodes: [
              {
                id: "p1",
                label: "Fochizzy",
                assistsGiven: 24,
                prestigeGiven: 11,
                assistsReceived: 39,
                prestigeReceived: 29,
              },
              { id: "p2", label: "Corey", assistsGiven: 31 },
            ],
            edges: [
              {
                fromId: "p2",
                toId: "p1",
                assistCount: 17,
                assistPrestige: 13,
                assistFrequencyPerGame: 0.944,
              },
            ],
          },
          correlations: {},
        }}
      />,
    );

    expect(screen.getByText("Assist network")).toBeInTheDocument();
    expect(screen.getByText("Corey → Fochizzy")).toBeInTheDocument();
    expect(screen.getByText("0.94")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("shows numeric correlations with their strength instead of placeholder copy", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 18 },
          topSignals: [],
          correlations: {
            macro: [
              {
                key: "tempoControl",
                label: "Tempo Control",
                value: 0.45,
                strength: "Moderate",
              },
            ],
            items: [
              {
                key: "objectives-vs-wins",
                label: "Objective prestige",
                description: "Avg 3.00 in wins vs 1.18 in losses",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Tempo Control")).toBeInTheDocument();
    expect(screen.getByText(/\+0\.45/)).toBeInTheDocument();
    expect(screen.getByText(/Moderate/)).toBeInTheDocument();
    expect(
      screen.getByText("Avg 3.00 in wins vs 1.18 in losses"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Correlation insight")).not.toBeInTheDocument();
  });

  it("renders safely when the server payload omits optional insight arrays", () => {
    render(
      <InsightsView
        payload={
          {
            generatedAt: "2026-07-05T03:00:00.000Z",
            meta: { games: 0 },
            correlations: { summary: "Need at least 2 games for insights." },
          } as never
        }
      />,
    );

    expect(
      screen.getByText(/Need at least 2 games for insights/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/No top signals returned/i)).toBeInTheDocument();
  });

  it("does not promote placeholder copy into the page header", () => {
    render(
      <InsightsView
        payload={
          {
            generatedAt: "2026-07-05T03:00:00.000Z",
            meta: {},
            topSignals: [],
            correlations: {},
          } as never
        }
      />,
    );

    expect(
      screen.queryByText(/Server-authored relationship summaries will appear/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Published over 0 tracked games/i)).not.toBeInTheDocument();
  });

  it("keeps a missing rivalry field distinguishable from a real zero", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 18 },
          topSignals: [],
          rivalries: [
            {
              opponentId: "p2",
              opponentName: "GregMTG",
              gamesTogether: 18,
              wins: 0,
              losses: 8,
            },
          ],
          correlations: {},
        }}
      />,
    );

    const cells = screen.getAllByRole("cell");
    // wins is a real 0; draws was never published and must not read as 0.
    expect(cells[2]).toHaveTextContent("0");
    expect(cells[4]).toHaveTextContent("—");
  });

  it("labels shared games a third player won rather than calling them draws", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 18 },
          topSignals: [],
          rivalries: [
            {
              opponentId: "p2",
              opponentName: "GregMTG",
              gamesTogether: 18,
              wins: 1,
              losses: 8,
              draws: 9,
            },
          ],
          correlations: {},
        }}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Others won" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Draws" }),
    ).not.toBeInTheDocument();
  });
});
