import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DASHBOARD_CHARTS } from "@/components/charts/chartCatalog";
import { ChartRenderer } from "@/components/charts/ChartRenderer";

import {
  buildPreviewChartPayload,
  PREVIEW_FOCUS_PLAYER,
  PREVIEW_GAME_COUNT,
  PREVIEW_LEAGUE_ROWS,
  PREVIEW_LEAGUE_SUMMARY,
  PREVIEW_RIVAL_PLAYER,
} from "./previewData";
import { PREVIEW_ELO_HISTORY, PREVIEW_GAMES } from "./previewSnapshot";

vi.mock("recharts", async () => {
  const { rechartsStub } = await import("../../test/rechartsStub");
  return rechartsStub;
});

describe("preview chart payloads", () => {
  it.each(DASHBOARD_CHARTS.map((chart) => [chart.key, chart.title]))(
    "renders %s (%s) without falling back to an empty state",
    (chartKey) => {
      const payload = buildPreviewChartPayload(chartKey);

      // A catalog entry with no payload would advertise a chart the preview
      // cannot actually show.
      expect(payload).not.toBeNull();

      const { container } = render(
        <ChartRenderer chartKey={chartKey} payload={payload!} />,
      );

      expect(container.querySelector(".empty")).toBeNull();
    },
  );
});

describe("preview league figures", () => {
  it("counts each player's games from the games they actually appear in", () => {
    expect(PREVIEW_LEAGUE_ROWS).toHaveLength(4);

    for (const row of PREVIEW_LEAGUE_ROWS) {
      const appearances = PREVIEW_GAMES.filter((game) =>
        game.some((result) => result.playerId === row.id),
      ).length;

      expect(row.games).toBe(appearances);
      expect(row.games).toBeLessThanOrEqual(PREVIEW_GAME_COUNT);
      expect(row.games).toBeGreaterThan(0);
    }
  });

  it("gives every player one rating point per game they played", () => {
    for (const row of PREVIEW_LEAGUE_ROWS) {
      const ratings = PREVIEW_ELO_HISTORY[row.id];

      expect(ratings).toHaveLength(row.games);
      expect(row.elo).toBe(ratings[ratings.length - 1]);
    }
  });

  it("shares out exactly one win per finished game", () => {
    const totalWins = PREVIEW_LEAGUE_ROWS.reduce(
      (total, row) => total + row.wins,
      0,
    );
    const gamesWithWinner = PREVIEW_GAMES.filter((game) =>
      game.some((result) => result.won),
    ).length;

    expect(totalWins).toBe(gamesWithWinner);
  });

  it("ranks the table by rating", () => {
    const ratings = PREVIEW_LEAGUE_ROWS.map((row) => row.elo);

    expect(ratings).toEqual([...ratings].sort((left, right) => right - left));
  });

  it("derives the league summary from the same rows the table renders", () => {
    const totalPrestige = PREVIEW_LEAGUE_ROWS.reduce(
      (total, row) => total + row.totalPrestige,
      0,
    );

    expect(PREVIEW_LEAGUE_SUMMARY.totalPrestige).toBe(totalPrestige);
    expect(PREVIEW_LEAGUE_SUMMARY.seatsPlayed).toBe(PREVIEW_GAMES.flat().length);
    expect(PREVIEW_LEAGUE_SUMMARY.closestMargin).toBeGreaterThanOrEqual(0);
    expect(PREVIEW_LEAGUE_SUMMARY.closestGameLabel).toMatch(/^G\d+$/);
  });

  it("points the matchup charts at the two most-seated players", () => {
    const bySeatCount = [...PREVIEW_LEAGUE_ROWS].sort(
      (left, right) => right.games - left.games,
    );

    expect(PREVIEW_FOCUS_PLAYER.id).toBe(bySeatCount[0]?.id);
    expect(PREVIEW_RIVAL_PLAYER.id).toBe(bySeatCount[1]?.id);
    expect(PREVIEW_FOCUS_PLAYER.id).not.toBe(PREVIEW_RIVAL_PLAYER.id);
  });
});

describe("preview snapshot integrity", () => {
  it("publishes only aliased names", () => {
    const serialized = JSON.stringify(PREVIEW_GAMES);

    for (const realName of ["Corey", "Greg", "Izzy", "James"]) {
      expect(serialized).not.toContain(realName);
    }
  });

  /**
   * Score is carried as the app recorded it, not recomputed. A quarter of the
   * rows sit above or below `prestige + 5·contracts + 3·assists − 4·failures`
   * because head-to-head mission bonuses are folded into the stored score and
   * are not a column on `game_participants`, so only the loose bound holds.
   */
  it("keeps every recorded score within reach of the scoring rules", () => {
    for (const game of PREVIEW_GAMES) {
      for (const result of game) {
        const withoutBonuses =
          result.totalPrestige +
          result.contracts * 5 +
          result.assists * 3 -
          result.failures * 4;

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(Math.abs(result.score - withoutBonuses)).toBeLessThanOrEqual(12);
      }
    }
  });

  it("keeps total prestige equal to its three recorded parts", () => {
    for (const game of PREVIEW_GAMES) {
      for (const result of game) {
        expect(result.totalPrestige).toBe(
          result.directPrestige +
            result.assistPrestigeReceived +
            result.objectivePrestige,
        );
      }
    }
  });
});
