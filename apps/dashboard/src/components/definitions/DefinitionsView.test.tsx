import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { DefinitionSection } from "@/lib/definitions/definitionsScreen";

import { DefinitionsView } from "./DefinitionsView";

const SECTIONS: DefinitionSection[] = [
  {
    key: "scoring",
    title: "Scoring",
    subtitle: "Raw production and results.",
    items: [
      {
        key: "winRate",
        title: "Win Rate",
        body: "Wins divided by games played.",
        bodyLines: [
          {
            bullet: false,
            segments: [
              { type: "text", text: "Wins divided by " },
              { type: "term", text: "Games Played", metric: "games", category: "scoring" },
              { type: "text", text: "." },
            ],
          },
        ],
        related: [{ category: "scoring", key: "games", title: "Games Played" }],
      },
      {
        key: "games",
        title: "Games Played",
        body: "Total games in the current sample.",
        bodyLines: [
          {
            bullet: false,
            segments: [{ type: "text", text: "Total games in the current sample." }],
          },
        ],
        related: [],
      },
    ],
  },
  {
    key: "support",
    title: "Support",
    subtitle: "Assist flow across the table.",
    items: [
      {
        key: "assistShare",
        title: "Assist Share",
        body: "Share of table assists you provide.",
        bodyLines: [
          {
            bullet: false,
            segments: [{ type: "text", text: "Share of table assists you provide." }],
          },
        ],
        related: [],
      },
    ],
  },
];

describe("DefinitionsView", () => {
  it("opens on the category that owns the deep-linked metric", () => {
    render(
      <DefinitionsView
        category={null}
        metric="assistShare"
        sections={SECTIONS}
        sourceLabel="Stats"
      />,
    );

    expect(screen.getByRole("button", { name: "Support" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("From Stats")).toBeInTheDocument();
    expect(screen.queryByText("Win Rate")).not.toBeInTheDocument();
  });

  it("links definition body terms to their own definition entry", () => {
    render(
      <DefinitionsView
        category={null}
        metric={null}
        sections={SECTIONS}
        sourceLabel={null}
      />,
    );

    const links = screen.getAllByRole("link", { name: "Games Played" });

    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute(
        "href",
        "/definitions?metric=games&category=scoring",
      );
    });
  });

  it("filters the catalog down to the searched metric", async () => {
    const user = userEvent.setup();
    render(
      <DefinitionsView
        category={null}
        metric={null}
        sections={SECTIONS}
        sourceLabel={null}
      />,
    );

    await user.type(screen.getByRole("searchbox"), "assist share");

    expect(screen.getByText("Assist Share")).toBeInTheDocument();
    expect(screen.queryByText("Win Rate")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 3 tracked metrics.")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(
      <DefinitionsView
        category={null}
        metric={null}
        sections={SECTIONS}
        sourceLabel={null}
      />,
    );

    await user.type(screen.getByRole("searchbox"), "zzzzzzzz");

    expect(screen.getByText("No matching definitions")).toBeInTheDocument();
  });
});
