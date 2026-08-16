import type { ChartDatasetPayload } from "@moonrakers/analytics-contract";

import {
  PREVIEW_ASSIST_EDGES,
  PREVIEW_ELO_HISTORY,
  PREVIEW_GAMES,
  PREVIEW_PLAYERS,
  PREVIEW_PRESTIGE_BY_OWN_ROUND,
  PREVIEW_REPLAY_GAME,
  type PreviewPlayerId,
} from "./previewSnapshot";

/**
 * Turns the frozen league snapshot into the payloads the real chart renderers
 * read. Everything here is a derivation — sums, averages, ranks, cumulatives —
 * so a figure on the page can always be traced back to a row in
 * `previewSnapshot.ts` rather than to a number someone typed twice.
 */

type PreviewGameResult = (typeof PREVIEW_GAMES)[number][number];

export type PreviewCrewMember = (typeof PREVIEW_PLAYERS)[number];

export const PREVIEW_CREW = PREVIEW_PLAYERS;
export const PREVIEW_GAME_COUNT = PREVIEW_GAMES.length;

const GAME_LABELS = PREVIEW_GAMES.map((_, index) => `G${index + 1}`);

/**
 * A rendered chart carries `generatedAt` into its own markup, so a live clock
 * would hand the server and the browser two different strings and break
 * hydration on a page that is otherwise fully static.
 */
const PREVIEW_GENERATED_AT = "2026-08-16T00:00:00.000Z";

function resultFor(playerId: PreviewPlayerId, gameIndex: number) {
  return PREVIEW_GAMES[gameIndex]?.find(
    (result) => result.playerId === playerId,
  );
}

function resultsFor(playerId: PreviewPlayerId) {
  return PREVIEW_GAMES.flatMap((game) =>
    game.filter((result) => result.playerId === playerId),
  );
}

const chartPlayers = PREVIEW_PLAYERS.map((member) => ({
  color: member.colorName,
  id: member.id,
  name: member.name,
}));

export type PreviewLeagueRow = {
  assistPrestige: number;
  elo: number;
  games: number;
  id: PreviewPlayerId;
  name: string;
  prestigePerGame: number;
  scorePerGame: number;
  totalPrestige: number;
  winRate: number;
  wins: number;
};

function buildLeagueRows(): PreviewLeagueRow[] {
  return PREVIEW_PLAYERS.map((member) => {
    const results = resultsFor(member.id);
    const games = results.length;
    const wins = results.filter((result) => result.won).length;
    const totalPrestige = results.reduce(
      (total, result) => total + result.totalPrestige,
      0,
    );
    const totalScore = results.reduce(
      (total, result) => total + result.score,
      0,
    );
    const ratings = PREVIEW_ELO_HISTORY[member.id];

    return {
      assistPrestige: results.reduce(
        (total, result) => total + result.assistPrestigeReceived,
        0,
      ),
      elo: ratings[ratings.length - 1] ?? 1000,
      games,
      id: member.id,
      name: member.name,
      prestigePerGame: games > 0 ? totalPrestige / games : 0,
      scorePerGame: games > 0 ? totalScore / games : 0,
      totalPrestige,
      winRate: games > 0 ? (wins / games) * 100 : 0,
      wins,
    };
  }).sort((left, right) => right.elo - left.elo);
}

export const PREVIEW_LEAGUE_ROWS = buildLeagueRows();

function buildLeagueSummary() {
  const allResults = PREVIEW_GAMES.flat();
  const totalPrestige = allResults.reduce(
    (total, result) => total + result.totalPrestige,
    0,
  );
  const assistPrestige = PREVIEW_ASSIST_EDGES.reduce(
    (total, edge) => total + edge.assistPrestige,
    0,
  );

  const margins = PREVIEW_GAMES.map((game, gameIndex) => {
    const [best, second] = game
      .map((result) => result.totalPrestige)
      .sort((left, right) => right - left);

    return {
      gameLabel: GAME_LABELS[gameIndex] ?? "",
      margin: (best ?? 0) - (second ?? 0),
    };
  }).sort((left, right) => left.margin - right.margin);

  return {
    assistCount: PREVIEW_ASSIST_EDGES.reduce(
      (total, edge) => total + edge.assists,
      0,
    ),
    assistPrestige,
    assistShareOfPrestige:
      totalPrestige > 0 ? (assistPrestige / totalPrestige) * 100 : 0,
    closestGameLabel: margins[0]?.gameLabel ?? "",
    closestMargin: margins[0]?.margin ?? 0,
    playerCount: PREVIEW_PLAYERS.length,
    prestigePerSeat:
      allResults.length > 0 ? totalPrestige / allResults.length : 0,
    seatsPlayed: allResults.length,
    totalGames: PREVIEW_GAME_COUNT,
    totalPrestige,
  };
}

export const PREVIEW_LEAGUE_SUMMARY = buildLeagueSummary();

/**
 * A player who sat out a game has no value for it, and `0` would read as "they
 * scored nothing" rather than "they were not at the table". Carry the last
 * value forward so the line runs flat across games they missed.
 */
function buildSnapshotRows(read: (result: PreviewGameResult) => number) {
  const carried = new Map<PreviewPlayerId, number>();

  return PREVIEW_GAMES.map((game, gameIndex) => ({
    label: GAME_LABELS[gameIndex] ?? `G${gameIndex + 1}`,
    snapshot: Object.fromEntries(
      PREVIEW_PLAYERS.map((member) => {
        const result = game.find((entry) => entry.playerId === member.id);
        if (result) {
          carried.set(member.id, read(result));
        }

        return [member.id, { value: carried.get(member.id) ?? 0 }];
      }),
    ),
  }));
}

/** Where a player finished on prestige in each game they played. */
function buildRankSeries(playerId: PreviewPlayerId) {
  return PREVIEW_GAMES.flatMap((game, gameIndex) => {
    const result = resultFor(playerId, gameIndex);
    if (!result) {
      return [];
    }

    const ordered = game
      .map((entry) => entry.totalPrestige)
      .sort((left, right) => right - left);

    return [
      {
        label: GAME_LABELS[gameIndex] ?? `G${gameIndex + 1}`,
        rank: ordered.indexOf(result.totalPrestige) + 1,
      },
    ];
  });
}

function averageOf(
  playerId: PreviewPlayerId,
  read: (result: PreviewGameResult) => number,
) {
  const results = resultsFor(playerId);

  return results.length > 0
    ? results.reduce((total, result) => total + read(result), 0) / results.length
    : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** Prestige banked per contract taken. */
function efficiencyOf(result: PreviewGameResult) {
  return result.contracts > 0 ? result.totalPrestige / result.contracts : 0;
}

function sharedGames(a: PreviewPlayerId, b: PreviewPlayerId) {
  return PREVIEW_GAMES.filter(
    (game) =>
      game.some((result) => result.playerId === a) &&
      game.some((result) => result.playerId === b),
  );
}

function headToHead(a: PreviewPlayerId, b: PreviewPlayerId) {
  const shared = sharedGames(a, b);

  const takenBy = (self: PreviewPlayerId, other: PreviewPlayerId) =>
    shared.filter((game) => {
      const mine = game.find((result) => result.playerId === self);
      const theirs = game.find((result) => result.playerId === other);
      return (mine?.totalPrestige ?? 0) > (theirs?.totalPrestige ?? 0);
    }).length;

  const rowsIn = (self: PreviewPlayerId) =>
    shared
      .map((game) => game.find((result) => result.playerId === self))
      .filter((result): result is PreviewGameResult => Boolean(result));

  const avgIn = (self: PreviewPlayerId) => {
    const rows = rowsIn(self);
    return rows.length > 0
      ? rows.reduce((total, row) => total + row.totalPrestige, 0) / rows.length
      : 0;
  };

  const bestIn = (self: PreviewPlayerId) =>
    Math.max(0, ...rowsIn(self).map((row) => row.totalPrestige));

  return {
    aAvg: round1(avgIn(a)),
    aBest: bestIn(a),
    aTaken: takenBy(a, b),
    bAvg: round1(avgIn(b)),
    bBest: bestIn(b),
    bTaken: takenBy(b, a),
    shared: shared.length,
  };
}

function assistsSentBy(playerId: PreviewPlayerId) {
  return PREVIEW_ASSIST_EDGES.filter((edge) => edge.from === playerId).reduce(
    (total, edge) => total + edge.assists,
    0,
  );
}

function assistsReceivedBy(playerId: PreviewPlayerId) {
  return PREVIEW_ASSIST_EDGES.filter((edge) => edge.to === playerId).reduce(
    (total, edge) => total + edge.assists,
    0,
  );
}

/** The two most-seated players drive the matchup and rating comparisons. */
const [FOCUS_PLAYER, RIVAL_PLAYER] = [...PREVIEW_LEAGUE_ROWS].sort(
  (left, right) => right.games - left.games,
) as [PreviewLeagueRow, PreviewLeagueRow, ...PreviewLeagueRow[]];

export {
  FOCUS_PLAYER as PREVIEW_FOCUS_PLAYER,
  RIVAL_PLAYER as PREVIEW_RIVAL_PLAYER,
};

function payload(
  chartKey: string,
  data: Record<string, unknown>,
): ChartDatasetPayload {
  return { chartKey, data, generatedAt: PREVIEW_GENERATED_AT };
}

/**
 * Trait spokes, each a real rate from the snapshot rescaled to 0–100 so eight
 * different units can share one radial axis. The second argument is the ceiling
 * that rate is measured against.
 */
function buildRadarRows(playerId: PreviewPlayerId) {
  const row = PREVIEW_LEAGUE_ROWS.find((entry) => entry.id === playerId);
  const games = Math.max(1, row?.games ?? 1);
  const scale = (value: number, ceiling: number) =>
    Math.round(Math.min(100, Math.max(0, (value / ceiling) * 100)));

  return [
    { label: "Winner", value: scale(row?.winRate ?? 0, 50) },
    { label: "Producer", value: scale(row?.prestigePerGame ?? 0, 16) },
    { label: "Scorer", value: scale(row?.scorePerGame ?? 0, 60) },
    { label: "Supporter", value: scale(assistsSentBy(playerId) / games, 2) },
    { label: "Receiver", value: scale(assistsReceivedBy(playerId) / games, 2) },
    { label: "Efficiency", value: scale(averageOf(playerId, efficiencyOf), 3) },
    {
      label: "Objectives",
      value: scale(averageOf(playerId, (result) => result.objectivePrestige), 3),
    },
    {
      label: "Reliability",
      value: scale(3 - averageOf(playerId, (result) => result.failures), 3),
    },
  ];
}

const CHART_BUILDERS: Record<string, () => ChartDatasetPayload> = {
  radar: () => {
    const focus = buildRadarRows(FOCUS_PLAYER.id);
    const rival = buildRadarRows(RIVAL_PLAYER.id);

    return payload("radar", {
      rows: focus.map((trait, index) => ({
        label: trait.label,
        focusValue: trait.value,
        compareValue: rival[index]?.value ?? 0,
      })),
    });
  },

  elo: () =>
    payload("elo", {
      data: PREVIEW_ELO_HISTORY[FOCUS_PLAYER.id].map((rating, index) => ({
        label: `#${index + 1}`,
        elo: rating,
        compareElo: PREVIEW_ELO_HISTORY[RIVAL_PLAYER.id][index] ?? null,
      })),
    }),

  prestige_over_time: () =>
    payload("prestige_over_time", {
      metricKey: "value",
      mode: "cumulative",
      players: chartPlayers,
      data: buildSnapshotRows((result) => result.totalPrestige),
    }),

  relationship_graph: () =>
    payload("relationship_graph", {
      players: chartPlayers,
      edges: PREVIEW_ASSIST_EDGES.map((edge) => ({
        assistCount: edge.assists,
        assistPrestige: edge.assistPrestige,
        from: edge.from,
        id: `${edge.from}-${edge.to}`,
        to: edge.to,
        weight: edge.assists,
      })),
    }),

  compare: () =>
    payload("compare", {
      primaryLabel: FOCUS_PLAYER.name,
      comparisonLabel: RIVAL_PLAYER.name,
      activeMetricKey: "avgPrestigePerGame",
      rows: [
        {
          label: "Prestige / Game",
          focusValue: round1(FOCUS_PLAYER.prestigePerGame),
          compareValue: round1(RIVAL_PLAYER.prestigePerGame),
        },
        {
          label: "Direct / Game",
          focusValue: round1(
            averageOf(FOCUS_PLAYER.id, (result) => result.directPrestige),
          ),
          compareValue: round1(
            averageOf(RIVAL_PLAYER.id, (result) => result.directPrestige),
          ),
        },
        {
          label: "Assist / Game",
          focusValue: round1(
            averageOf(
              FOCUS_PLAYER.id,
              (result) => result.assistPrestigeReceived,
            ),
          ),
          compareValue: round1(
            averageOf(
              RIVAL_PLAYER.id,
              (result) => result.assistPrestigeReceived,
            ),
          ),
        },
        {
          label: "Objectives / Game",
          focusValue: round1(
            averageOf(FOCUS_PLAYER.id, (result) => result.objectivePrestige),
          ),
          compareValue: round1(
            averageOf(RIVAL_PLAYER.id, (result) => result.objectivePrestige),
          ),
        },
        {
          label: "Failures / Game",
          focusValue: round1(
            averageOf(FOCUS_PLAYER.id, (result) => result.failures),
          ),
          compareValue: round1(
            averageOf(RIVAL_PLAYER.id, (result) => result.failures),
          ),
        },
      ],
    }),

  head_to_head: () => {
    const matchup = headToHead(FOCUS_PLAYER.id, RIVAL_PLAYER.id);

    return payload("head_to_head", {
      primaryLabel: FOCUS_PLAYER.name,
      comparisonLabel: RIVAL_PLAYER.name,
      activeMetricKey: "totalPrestige",
      rows: [
        {
          label: "Shared Games",
          focusValue: matchup.shared,
          compareValue: matchup.shared,
        },
        {
          label: "Games Taken",
          focusValue: matchup.aTaken,
          compareValue: matchup.bTaken,
        },
        {
          label: "Avg Prestige",
          focusValue: matchup.aAvg,
          compareValue: matchup.bAvg,
        },
        {
          label: "Best Game",
          focusValue: matchup.aBest,
          compareValue: matchup.bBest,
        },
        {
          label: "Wins",
          focusValue: FOCUS_PLAYER.wins,
          compareValue: RIVAL_PLAYER.wins,
        },
      ],
    });
  },

  rivalry_graph: () =>
    payload("rivalry_graph", {
      primaryLabel: FOCUS_PLAYER.name,
      comparisonLabel: RIVAL_PLAYER.name,
      activeMetricKey: "assistShare",
      rows: [
        {
          label: "Games Played",
          focusValue: FOCUS_PLAYER.games,
          compareValue: RIVAL_PLAYER.games,
        },
        {
          label: "Wins",
          focusValue: FOCUS_PLAYER.wins,
          compareValue: RIVAL_PLAYER.wins,
        },
        {
          label: "Assists Sent",
          focusValue: assistsSentBy(FOCUS_PLAYER.id),
          compareValue: assistsSentBy(RIVAL_PLAYER.id),
        },
        {
          label: "Assists Received",
          focusValue: assistsReceivedBy(FOCUS_PLAYER.id),
          compareValue: assistsReceivedBy(RIVAL_PLAYER.id),
        },
        {
          label: "Assist Prestige",
          focusValue: FOCUS_PLAYER.assistPrestige,
          compareValue: RIVAL_PLAYER.assistPrestige,
        },
      ],
    }),

  sparkline: () => {
    const shared = sharedGames(FOCUS_PLAYER.id, RIVAL_PLAYER.id);
    const seriesFor = (playerId: PreviewPlayerId) =>
      shared.map((game, index) => {
        const result = game.find((entry) => entry.playerId === playerId);
        return {
          label: `#${index + 1}`,
          efficiency: result ? round1(efficiencyOf(result)) : 0,
        };
      });

    return payload("sparkline", {
      metricKey: "efficiency",
      primaryLabel: FOCUS_PLAYER.name,
      comparisonLabel: RIVAL_PLAYER.name,
      data: seriesFor(FOCUS_PLAYER.id),
      comparisonData: seriesFor(RIVAL_PLAYER.id),
    });
  },

  line_chart: () =>
    payload("line_chart", {
      metricKey: "value",
      mode: "raw",
      players: chartPlayers,
      data: buildSnapshotRows((result) => result.score),
    }),

  bar_chart: () =>
    payload("bar_chart", {
      data: PREVIEW_LEAGUE_ROWS.map((row) => ({
        label: row.name,
        prestige: row.totalPrestige,
      })),
    }),

  bump_chart: () =>
    payload("bump_chart", {
      data: buildRankSeries(FOCUS_PLAYER.id),
    }),

  heatmap: () =>
    payload("heatmap", {
      data: PREVIEW_PLAYERS.flatMap((member) =>
        PREVIEW_PRESTIGE_BY_OWN_ROUND[member.id].map((value, index) => ({
          playerId: member.id,
          playerName: member.name,
          xLabel: `R${index + 1}`,
          value,
        })),
      ),
    }),

  efficiency_failure_scatter: () =>
    payload("efficiency_failure_scatter", {
      data: PREVIEW_PLAYERS.map((member) => ({
        label: member.name,
        efficiency: round1(averageOf(member.id, efficiencyOf)),
        failures: round1(averageOf(member.id, (result) => result.failures)),
      })),
    }),

  replay_chart: () => {
    let running = 0;

    return payload("replay_chart", {
      replay: PREVIEW_REPLAY_GAME.turns.map((turn, index) => {
        running += turn.prestige;
        return { label: `T${index + 1}`, value: running };
      }),
    });
  },
};

/**
 * Returns null rather than a generic stand-in: a catalog entry with no written
 * sample would otherwise render an empty-state panel that reads like the chart
 * itself is broken. `previewData.test.tsx` keeps the two lists in step.
 */
export function buildPreviewChartPayload(
  chartKey: string,
): ChartDatasetPayload | null {
  return CHART_BUILDERS[chartKey]?.() ?? null;
}

/** Says whose games these are, so nobody reads the page as their own numbers. */
export const PREVIEW_SAMPLE_NOTE = `Real tracked games: ${PREVIEW_PLAYERS.length} players across ${PREVIEW_GAME_COUNT} finished games, published under aliases.`;
