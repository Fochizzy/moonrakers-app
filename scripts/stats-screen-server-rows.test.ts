import assert from "node:assert/strict";

import {
  normalizeStatsCorrelationRows,
  normalizeStatsGameRows,
  normalizeStatsPlayerCountOverviewRows,
  normalizeStatsPlayerCountSummaryRows,
} from "../lib/cloud/analytics/statsScreenDisplay.ts";

const correlationRows = normalizeStatsCorrelationRows([
  {
    key: "objectives-vs-wins",
    label: "Objective prestige",
    whenWin: 2.8,
    whenLose: 1.4,
    delta: 1.4,
    description: "Objectives track with winning.",
  },
  {
    key: "assists-vs-wins",
    label: "Assists",
    value: 0.32,
    strength: "Moderate",
  },
]);

assert.deepEqual(correlationRows, [
  {
    key: "objectives-vs-wins",
    label: "Objective prestige",
    value: "Win 2.8 | Loss 1.4",
    detail: "Delta +1.4 | Objectives track with winning.",
  },
  {
    key: "assists-vs-wins",
    label: "Assists",
    value: "0.32",
    detail: "Moderate correlation",
  },
]);

const gameRows = normalizeStatsGameRows([
  {
    gameId: "game-1",
    groupName: "Friday Crew",
    playerCount: 4,
    isWinner: true,
    prestige: 29,
    contracts: 5,
    assists: 2,
    failures: 1,
  },
  {
    gameId: "game-2",
    winnerName: "Nova",
    playerCount: 5,
    prestige: 22,
    prestigeSpread: 7,
    assists: 1,
    failures: 3,
    contracts: 4,
  },
]);

assert.deepEqual(gameRows, [
  {
    key: "game-1",
    label: "Friday Crew",
    value: "Win | 29 prestige | 4p",
    detail: "5 contracts | 2 assists | 1 failure",
  },
  {
    key: "game-2",
    label: "Game 2",
    value: "Loss | 22 prestige | 5p",
    detail: "Winner Nova | Spread 7 | 4 contracts | 1 assist | 3 failures",
  },
]);

const playerCountOverviewRows = normalizeStatsPlayerCountOverviewRows([
  {
    playerCount: 2,
    games: 4,
    wins: 3,
    winRate: 0.75,
    avgPrestige: 28,
    avgAssists: 1.5,
    avgFailures: 0.5,
  },
  {
    playerCount: 3,
    games: 2,
    wins: 1,
    winRate: 0.5,
    avgPrestige: 25,
    avgAssists: 2,
    avgFailures: 1,
  },
  {
    playerCount: 4,
    games: 3,
    wins: 2,
    winRate: 0.667,
    avgPrestige: 30,
    avgAssists: 1,
    avgFailures: 0.5,
  },
]);

assert.deepEqual(playerCountOverviewRows, [
  {
    key: "two-player-overview",
    label: "2-player",
    value: "75% win rate",
    detail: "4 games tracked | 3 wins | 28 avg prestige",
  },
  {
    key: "three-plus-overview",
    label: "3+ players",
    value: "60% win rate",
    detail: "5 games tracked | 3 wins | 28 avg prestige",
  },
]);

const playerCountSummaryRows = normalizeStatsPlayerCountSummaryRows([
  {
    playerCount: 2,
    games: 4,
    wins: 3,
    winRate: 0.75,
    avgPrestige: 28,
    avgAssists: 1.5,
    avgFailures: 0.5,
  },
  {
    playerCount: 3,
    games: 2,
    wins: 1,
    winRate: 0.5,
    avgPrestige: 25,
    avgAssists: 2,
    avgFailures: 1,
  },
  {
    playerCount: 4,
    games: 3,
    wins: 2,
    winRate: 0.667,
    avgPrestige: 30,
    avgAssists: 1,
    avgFailures: 0.5,
  },
]);

assert.deepEqual(playerCountSummaryRows, [
  {
    key: "two-player-summary",
    label: "2-player",
    value: "3W | 1L | 75% win rate",
    detail: "4 games | 28 avg prestige | 1.5 avg assists | 0.5 avg failures",
  },
  {
    key: "three-plus-summary",
    label: "3+ players",
    value: "3W | 2L | 60% win rate",
    detail: "5 games | 28 avg prestige | 1.4 avg assists | 0.7 avg failures",
  },
]);

assert.deepEqual(normalizeStatsPlayerCountOverviewRows([]), []);

assert.deepEqual(
  normalizeStatsPlayerCountSummaryRows([
    {
      playerCount: 2,
      games: 1,
      wins: 1,
      winRate: 1,
      avgPrestige: 31,
      avgAssists: 2,
      avgFailures: 0,
    },
  ]),
  [
    {
      key: "two-player-summary",
      label: "2-player",
      value: "1W | 0L | 100% win rate",
      detail: "1 game | 31 avg prestige | 2 avg assists | 0 avg failures",
    },
  ],
);

assert.deepEqual(
  normalizeStatsPlayerCountOverviewRows([
    {
      playerCount: 4,
      games: 3,
      wins: 2,
      winRate: 0.667,
      avgPrestige: 30,
      avgAssists: 1,
      avgFailures: 0.5,
    },
    {
      playerCount: 2.5,
      games: 2,
      wins: 1,
      winRate: 0.5,
      avgPrestige: 26,
      avgAssists: 1.2,
      avgFailures: 0.4,
    },
    {
      playerCount: 2,
      games: 4,
      wins: 3,
      winRate: 0.75,
      avgPrestige: 28,
      avgAssists: 1.5,
      avgFailures: 0.5,
    },
  ]),
  [
    {
      key: "two-player-overview",
      label: "2-player",
      value: "75% win rate",
      detail: "4 games tracked | 3 wins | 28 avg prestige",
    },
    {
      key: "three-plus-overview",
      label: "3+ players",
      value: "67% win rate",
      detail: "3 games tracked | 2 wins | 30 avg prestige",
    },
  ],
);

console.log("stats-screen-server-rows.test.ts passed");
