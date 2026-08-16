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

  /**
   * The bow used to be picked from the edge's index in the array, so a pair
   * that assists both ways drew one arc on top of the other and stacked both
   * labels on the same point.
   */
  it("bows the two directions of a pair onto opposite sides", () => {
    const { container } = render(
      <NetworkChartPanel payload={{ data: networkData }} />,
    );

    const paths = [...container.querySelectorAll("path[marker-end]")].map(
      (node) => node.getAttribute("d"),
    );

    expect(paths).toHaveLength(2);
    expect(paths[0]).not.toBe(paths[1]);

    // With two nodes the layout stacks them vertically, so the bow shows up on
    // the control point's x: one arc left of the straight line, one right.
    const controlX = (d: string | null) =>
      Number(d?.split(" Q ")[1]?.split(" ")[0] ?? 0);
    const [first, second] = paths.map(controlX);
    const centreX = 880 / 2;

    expect(first).not.toBe(second);
    expect(Math.sign(first - centreX)).toBe(-Math.sign(second - centreX));
  });
});
