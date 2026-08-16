import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PreviewStatFamily } from "@/lib/preview/previewCatalog";

import { PREVIEW_LEAGUE_ROWS } from "./previewData";
import { PreviewView } from "./PreviewView";

vi.mock("recharts", async () => {
  const { rechartsStub } = await import("../../test/rechartsStub");
  return rechartsStub;
});

const families: PreviewStatFamily[] = [
  {
    key: "scoring",
    title: "Scoring",
    subtitle: "Raw production, board totals, and game results.",
    metricCount: 3,
    metricTitles: ["Total Prestige", "Win Rate", "Games Played"],
  },
  {
    key: "elo",
    title: "ELO",
    subtitle: "Rating terms and matchup context.",
    metricCount: 12,
    metricTitles: Array.from(
      { length: 12 },
      (_, index) => `Rating ${index + 1}`,
    ),
  },
];

function renderPreview() {
  return render(
    <PreviewView chartCount={14} families={families} metricCount={15} />,
  );
}

function openSection(label: string) {
  const nav = screen.getByRole("navigation", { name: /preview sections/i });

  return userEvent.click(
    within(nav).getByRole("button", { name: new RegExp(`^${label}`) }),
  );
}

describe("PreviewView", () => {
  it("says up front that no account is needed and whose games these are", () => {
    renderPreview();

    const topbar = within(screen.getByRole("banner"));

    expect(topbar.getByText("Preview")).toBeInTheDocument();
    expect(topbar.getByText(/no account needed/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /inside moonraker’s analytics/i }),
    ).toBeInTheDocument();
    // Said in the hero, and repeated under the chart so it travels with it.
    expect(
      screen.getByText(/every chart, every published metric/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/published under aliases/i).length,
    ).toBeGreaterThan(1);
  });

  // The app and the board game have similar names, and the app used to be
  // called something else again, so the preview has to settle both.
  it("names the app, and keeps it distinct from the board game", () => {
    renderPreview();

    expect(
      within(screen.getByRole("banner")).getByText(/moonraker’s analytics/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/companion app for the board game moonrakers/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/moonrakers command/i)).not.toBeInTheDocument();
  });

  it("names the tracked league in the hero", () => {
    renderPreview();

    const crew = screen.getByRole("list", { name: /the tracked league/i });

    expect(within(crew).getByText("Lurker")).toBeInTheDocument();
    expect(within(crew).getByText("GregMtG")).toBeInTheDocument();
    expect(within(crew).getByText("Fochizzy")).toBeInTheDocument();
    expect(within(crew).getByText("Revloki")).toBeInTheDocument();
  });

  it("leads with the chart gallery and renders the selected chart", () => {
    renderPreview();

    const nav = screen.getByRole("navigation", { name: /preview sections/i });

    expect(within(nav).getByRole("button", { name: /^Charts/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Radar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 14")).toBeInTheDocument();
  });

  it("swaps the rendered chart when another catalog entry is chosen", async () => {
    renderPreview();

    await userEvent.click(
      screen.getByRole("button", { name: "Preview the Heatmap chart" }),
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Heatmap" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/darker is higher/i)).toBeInTheDocument();
  });

  it("steps through the catalog with the next control", async () => {
    renderPreview();

    await userEvent.click(screen.getByRole("button", { name: "Next chart" }));

    expect(screen.getByText("2 / 14")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "ELO" }),
    ).toBeInTheDocument();
  });

  it("publishes every metric family and its full metric list", async () => {
    renderPreview();

    await openSection("Statistics");

    // Scoped to the catalog panel: the worked-example table above it names some
    // of the same families and metrics, on purpose.
    const catalog = within(
      screen
        .getByRole("heading", { name: /every metric the app publishes/i })
        .closest(".panel") as HTMLElement,
    );

    expect(catalog.getByText("Scoring")).toBeInTheDocument();
    expect(catalog.getByText("Total Prestige")).toBeInTheDocument();
    // The long family stays collapsed but still carries all of its names.
    expect(catalog.getByText("Rating 12")).toBeInTheDocument();
  });

  it("answers a published metric instead of only naming it", async () => {
    renderPreview();

    await openSection("Statistics");

    const worked = within(
      screen
        .getByRole("heading", { name: /what the numbers look like/i })
        .closest(".panel") as HTMLElement,
    );

    // The catalog's own definition, then a value for every player in the league.
    expect(
      worked.getByText(/average total prestige generated per game/i),
    ).toBeInTheDocument();

    const row = worked.getByText("Prestige / Game").closest("tr") as HTMLElement;

    expect(within(row).getAllByRole("cell")).toHaveLength(
      1 + PREVIEW_LEAGUE_ROWS.length,
    );
    expect(row).toHaveTextContent(/\d+\.\d/);
  });

  it("reads a playstyle back to the player, not just their totals", async () => {
    renderPreview();

    await openSection("Statistics");

    const read = within(
      screen
        .getByRole("heading", { name: /what it says about how you play/i })
        .closest(".panel") as HTMLElement,
    );

    expect(read.getAllByText("Style Read").length).toBe(
      PREVIEW_LEAGUE_ROWS.length,
    );
    expect(read.getAllByText("Support Style").length).toBe(
      PREVIEW_LEAGUE_ROWS.length,
    );
    // The table-wide statements come from the app's own summary builder.
    expect(read.getByText(/top read:/i)).toBeInTheDocument();
  });

  it("labels each page with what it is for and what is on it", async () => {
    renderPreview();

    await openSection("Pages");

    expect(
      screen.getByRole("heading", { name: /pages you get/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Charts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Definitions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/14 charts grouped by the question you are asking/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/15 metrics across 2 families/i)).toBeInTheDocument();
  });

  it("shows the game entry screen with its walkthrough", async () => {
    renderPreview();

    await openSection("Game Entry");

    expect(
      screen.getByRole("heading", { name: "Direct Prestige" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Lurker prestige and score"),
    ).toBeInTheDocument();
    expect(screen.getByText("Live standings")).toBeInTheDocument();
  });

  it("keeps a route to the sign-in form without ever demanding one", () => {
    renderPreview();

    const authLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/auth");

    expect(authLinks.length).toBeGreaterThanOrEqual(2);
  });
});
