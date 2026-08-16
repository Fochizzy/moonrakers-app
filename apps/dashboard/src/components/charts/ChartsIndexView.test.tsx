import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartsIndexView } from "./ChartsIndexView";

describe("ChartsIndexView", () => {
  it("keeps the current focus player on chart launch links", () => {
    render(<ChartsIndexView focusPlayerId="player-42" />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute(
        "href",
        expect.stringContaining("focusPlayerId=player-42"),
      );
    }
  });

  it("renders plain chart links when no focus player is selected", () => {
    render(<ChartsIndexView />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("focusPlayerId=");
    }
  });
});
