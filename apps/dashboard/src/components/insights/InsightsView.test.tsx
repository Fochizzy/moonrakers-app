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
});
