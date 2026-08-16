import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NetworkChartPanel } from "./NetworkChartPanel";

const networkData = {
  nodes: [
    { id: "izzy", label: "Izzy", color: "#3B82F6" },
    { id: "corey", label: "Corey", color: "#F59E0B" },
  ],
  edges: [
    { id: "izzy-corey", fromId: "izzy", toId: "corey", weight: 3 },
    { id: "corey-izzy", fromId: "corey", toId: "izzy", weight: 2 },
  ],
};

describe("NetworkChartPanel focus", () => {
  it("applies the published focus player when the relationship graph switches", () => {
    const { rerender } = render(
      <NetworkChartPanel
        payload={{
          data: {
            ...networkData,
            meta: { focusPlayerId: "corey" },
          },
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Focus: Corey");
    expect(screen.getByLabelText("Assist network diagram")).toHaveAttribute(
      "data-focus-player-id",
      "corey",
    );

    rerender(
      <NetworkChartPanel
        payload={{
          data: {
            ...networkData,
            meta: { focusPlayerId: "izzy" },
          },
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Focus: Izzy");
    expect(screen.getByLabelText("Assist network diagram")).toHaveAttribute(
      "data-focus-player-id",
      "izzy",
    );
  });
});
