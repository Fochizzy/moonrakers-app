import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InsightsView } from "./InsightsView";

describe("InsightsView", () => {
  it("renders top signals and relationship insights", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 10 },
          cards: [],
          topSignals: [
            {
              key: "pace",
              label: "Pace",
              value: 0.7,
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
    expect(screen.getByText(/Nova feeds Vex/i)).toBeInTheDocument();
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

    expect(screen.getByText(/Need at least 2 games for insights/i)).toBeInTheDocument();
    expect(screen.getByText(/No top signals returned/i)).toBeInTheDocument();
  });
});
