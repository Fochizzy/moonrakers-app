import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartRenderer } from "./ChartRenderer";

describe("ChartRenderer", () => {
  it("routes compare datasets into the comparison renderer family", () => {
    render(
      <ChartRenderer
        chartKey="compare"
        payload={{
          chartKey: "compare",
          generatedAt: "2026-07-04T03:00:00.000Z",
          title: "Compare players",
          data: { rows: [] },
        }}
      />,
    );

    expect(screen.getByText("Compare players")).toBeInTheDocument();
  });
});
