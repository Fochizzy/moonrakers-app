import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeView } from "./HomeView";

describe("HomeView", () => {
  it("renders the analytics hero cards from the server payload", () => {
    render(
      <HomeView
        focusName="Nova"
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          hero: { players: 4, games: 18, views: 5 },
          cards: [{ key: "win-rate", label: "Win Rate", value: "61%" }],
        }}
      />,
    );

    expect(screen.getByText("Nova")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("61%")).toBeInTheDocument();
  });
});
