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
        }}
        dataset={{
          title: "Compare players",
          subtitle: "Direct side-by-side read",
          data: { rows: [] },
        }}
      />,
    );

    expect(screen.getByLabelText(/focus player/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/compare player/i)).toBeInTheDocument();
    expect(screen.getByText("Compare players")).toBeInTheDocument();
  });
});
