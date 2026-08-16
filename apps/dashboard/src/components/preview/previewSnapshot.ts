/**
 * A frozen, aliased snapshot of the real Moonrakers league.
 *
 * Pulled from the `games` / `game_participants` / `game_rounds` tables on
 * 2026-08-16 and checked in as static data on purpose: `/preview` is a
 * signed-out page, so it must not hold a database connection or a key, and the
 * numbers a visitor sees must not move under them mid-session.
 *
 * Every real player name is replaced by the alias its owner chose. No profile
 * ids, no game ids, and no timestamps are carried over — only the game order,
 * which is all the charts need.
 *
 * `score` is whatever the app recorded, not a recomputation: head-to-head
 * mission bonuses are folded into it and have no column of their own, so a
 * quarter of the rows sit off `prestige + 5·contracts + 3·assists − 4·failures`.
 *
 * To refresh: re-run the queries in `previewSnapshot.README.md` and replace the
 * arrays below. Nothing else in the preview needs touching.
 */

export type PreviewPlayerId = "lurker" | "fochizzy" | "gregmtg" | "revloki";

export type PreviewPlayer = {
  /** Turn-theme accent, so the game-entry mock matches the phone screen. */
  accent: string;
  /** Palette word the app stores; chart renderers resolve it to the real accent. */
  colorName: "green" | "blue" | "purple" | "yellow";
  id: PreviewPlayerId;
  name: string;
};

/** Colour is each player's most recent `color_snapshot`. */
export const PREVIEW_PLAYERS: PreviewPlayer[] = [
  { id: "revloki", name: "Revloki", colorName: "yellow", accent: "#ecc58a" },
  { id: "gregmtg", name: "GregMtG", colorName: "blue", accent: "#40acc9" },
  { id: "fochizzy", name: "Fochizzy", colorName: "purple", accent: "#d082d7" },
  { id: "lurker", name: "Lurker", colorName: "green", accent: "#96c260" },
];

export type PreviewResult = {
  assistPrestigeReceived: number;
  assists: number;
  contracts: number;
  directPrestige: number;
  failures: number;
  objectivePrestige: number;
  playerId: PreviewPlayerId;
  score: number;
  /** `start_order`: seat 0 went first. */
  seat: number;
  totalPrestige: number;
  won: boolean;
};

/**
 * One row per player per finished game, in the order the games were played.
 * Column order: seat, totalPrestige, directPrestige, assistPrestigeReceived,
 * objectivePrestige, score, assists, failures, contracts, won.
 */
type ResultTuple = [
  PreviewPlayerId,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  0 | 1,
];

const GAME_TUPLES: ResultTuple[][] = [
  [
    ["revloki", 0, 11, 10, 1, 0, 54, 1, 0, 8, 0],
    ["gregmtg", 1, 15, 14, 1, 0, 40, 1, 2, 6, 1],
  ],
  [
    ["revloki", 0, 11, 10, 1, 0, 40, 1, 1, 6, 0],
    ["fochizzy", 1, 8, 6, 2, 0, 32, 3, 1, 5, 0],
    ["gregmtg", 2, 15, 13, 2, 0, 53, 2, 0, 7, 1],
  ],
  [
    ["revloki", 0, 5, 3, 2, 0, 15, 2, 2, 3, 0],
    ["gregmtg", 1, 15, 13, 2, 0, 49, 2, 1, 7, 1],
  ],
  [
    ["revloki", 0, 12, 11, 1, 0, 45, 2, 0, 6, 0],
    ["fochizzy", 1, 13, 12, 1, 0, 37, 1, 1, 5, 0],
    ["gregmtg", 2, 15, 15, 0, 0, 63, 1, 0, 9, 1],
  ],
  [
    ["revloki", 0, 15, 14, 1, 0, 48, 2, 0, 6, 1],
    ["fochizzy", 1, 8, 7, 1, 0, 36, 3, 0, 5, 0],
    ["gregmtg", 2, 9, 7, 2, 0, 32, 2, 0, 4, 0],
  ],
  [
    ["revloki", 0, 15, 13, 0, 2, 46, 0, 1, 7, 1],
    ["gregmtg", 1, 2, 2, 0, 0, 8, 1, 3, 3, 0],
  ],
  [
    ["revloki", 0, 16, 12, 1, 3, 54, 1, 0, 7, 1],
    ["gregmtg", 1, 8, 7, 1, 0, 40, 2, 1, 6, 0],
  ],
  [
    ["revloki", 0, 16, 14, 1, 1, 53, 2, 1, 7, 1],
    ["fochizzy", 1, 9, 7, 1, 1, 15, 1, 3, 3, 0],
    ["gregmtg", 2, 14, 9, 2, 3, 44, 3, 1, 5, 0],
  ],
  [
    ["revloki", 0, 9, 7, 0, 2, 35, 0, 1, 6, 0],
    ["fochizzy", 1, 10, 7, 0, 3, 13, 0, 3, 3, 0],
    ["gregmtg", 2, 15, 13, 0, 2, 50, 0, 0, 7, 1],
  ],
  [
    ["revloki", 0, 15, 11, 0, 4, 58, 1, 0, 8, 1],
    ["gregmtg", 1, 7, 3, 1, 3, 10, 0, 3, 3, 0],
  ],
  [
    ["revloki", 0, 15, 15, 0, 0, 60, 0, 0, 9, 1],
    ["fochizzy", 1, 4, 4, 0, 0, 12, 0, 3, 4, 0],
    ["gregmtg", 2, 10, 10, 0, 0, 45, 0, 0, 7, 0],
  ],
  [
    ["revloki", 0, 11, 10, 1, 0, 44, 1, 0, 6, 0],
    ["lurker", 1, 11, 10, 1, 0, 44, 4, 1, 5, 0],
    ["gregmtg", 2, 14, 13, 0, 1, 59, 5, 0, 6, 0],
    ["fochizzy", 3, 15, 6, 6, 3, 26, 0, 1, 3, 1],
  ],
  [
    ["revloki", 0, 5, 4, 0, 1, 15, 0, 0, 2, 0],
    ["lurker", 1, 7, 5, 0, 2, 33, 0, 1, 6, 0],
    ["gregmtg", 2, 12, 11, 0, 1, 47, 0, 0, 7, 1],
    ["fochizzy", 3, 10, 9, 0, 1, 30, 0, 0, 4, 0],
  ],
  [
    ["gregmtg", 0, 7, 6, 0, 1, 31, 4, 2, 4, 0],
    ["fochizzy", 1, 11, 7, 2, 2, 41, 3, 1, 5, 0],
    ["revloki", 2, 11, 8, 1, 2, 31, 1, 2, 5, 0],
    ["lurker", 3, 15, 11, 2, 2, 56, 2, 0, 7, 1],
  ],
  [
    ["revloki", 0, 16, 9, 2, 5, 42, 0, 1, 6, 1],
    ["fochizzy", 1, 5, 0, 2, 3, 34, 7, 3, 4, 0],
    ["gregmtg", 2, 8, 6, 0, 2, 43, 3, 1, 6, 0],
  ],
  [
    ["revloki", 0, 15, 12, 0, 3, 63, 1, 0, 9, 1],
    ["lurker", 1, 10, 7, 0, 3, 47, 5, 2, 6, 0],
    ["gregmtg", 2, 12, 8, 1, 3, 52, 3, 1, 7, 0],
    ["fochizzy", 3, 5, 1, 1, 3, 14, 2, 3, 3, 0],
  ],
  [
    ["fochizzy", 0, 12, 10, 1, 1, 43, 1, 1, 5, 0],
    ["revloki", 1, 12, 9, 0, 3, 28, 0, 1, 4, 0],
    ["lurker", 2, 9, 7, 1, 1, 39, 4, 2, 4, 0],
    ["gregmtg", 3, 16, 11, 2, 3, 59, 2, 0, 7, 1],
  ],
  [
    ["lurker", 0, 15, 13, 0, 2, 55, 3, 1, 7, 1],
    ["fochizzy", 1, 12, 6, 6, 0, 42, 3, 1, 5, 0],
    ["revloki", 2, 15, 13, 1, 1, 59, 3, 0, 6, 0],
    ["gregmtg", 3, 13, 12, 1, 0, 38, 2, 2, 5, 0],
  ],
  [
    ["gregmtg", 0, 12, 9, 0, 3, 45, 4, 1, 5, 0],
    ["lurker", 1, 12, 11, 0, 1, 43, 2, 0, 5, 0],
    ["fochizzy", 2, 9, 6, 1, 2, 27, 2, 2, 4, 0],
    ["revloki", 3, 15, 15, 0, 0, 54, 3, 0, 6, 1],
  ],
  [
    ["gregmtg", 0, 17, 13, 0, 4, 64, 0, 0, 9, 1],
    ["fochizzy", 1, 1, 1, 0, 0, 1, 0, 3, 1, 0],
    ["revloki", 2, 3, 3, 0, 0, 7, 0, 4, 2, 0],
  ],
  [
    ["fochizzy", 0, 9, 5, 3, 1, 42, 4, 1, 5, 0],
    ["revloki", 1, 13, 8, 4, 1, 46, 1, 0, 5, 0],
    ["gregmtg", 2, 18, 13, 3, 2, 62, 7, 1, 5, 1],
    ["lurker", 3, 8, 7, 1, 0, 33, 3, 1, 4, 0],
  ],
  [
    ["gregmtg", 0, 16, 12, 1, 3, 56, 5, 0, 5, 1],
    ["lurker", 1, 5, 3, 1, 1, 18, 2, 2, 3, 0],
    ["fochizzy", 2, 14, 8, 4, 2, 29, 0, 0, 3, 0],
    ["revloki", 3, 12, 9, 2, 1, 43, 2, 0, 5, 0],
  ],
  [
    ["gregmtg", 0, 12, 9, 2, 1, 34, 2, 1, 4, 0],
    ["lurker", 1, 11, 10, 0, 1, 54, 6, 0, 5, 0],
    ["fochizzy", 2, 8, 4, 3, 1, 30, 2, 1, 4, 0],
    ["revloki", 3, 15, 12, 2, 1, 43, 1, 0, 5, 1],
  ],
  [
    ["fochizzy", 0, 14, 10, 3, 1, 47, 2, 0, 5, 1],
    ["revloki", 1, 7, 5, 2, 0, 37, 2, 1, 5, 0],
    ["lurker", 2, 6, 5, 1, 0, 21, 4, 3, 3, 0],
  ],
  [
    ["revloki", 0, 15, 14, 0, 1, 53, 1, 0, 7, 1],
    ["lurker", 1, 2, 1, 1, 0, 17, 2, 2, 3, 0],
    ["fochizzy", 2, 6, 4, 2, 0, 10, 1, 3, 2, 0],
  ],
];

export const PREVIEW_GAMES: PreviewResult[][] = GAME_TUPLES.map((game) =>
  game.map(
    ([
      playerId,
      seat,
      totalPrestige,
      directPrestige,
      assistPrestigeReceived,
      objectivePrestige,
      score,
      assists,
      failures,
      contracts,
      won,
    ]) => ({
      assistPrestigeReceived,
      assists,
      contracts,
      directPrestige,
      failures,
      objectivePrestige,
      playerId,
      score,
      seat,
      totalPrestige,
      won: won === 1,
    }),
  ),
);

/** Directed assist flow across every tracked game. */
export const PREVIEW_ASSIST_EDGES: Array<{
  assistPrestige: number;
  assists: number;
  from: PreviewPlayerId;
  to: PreviewPlayerId;
}> = [
  { from: "lurker", to: "fochizzy", assists: 22, assistPrestige: 16 },
  { from: "gregmtg", to: "fochizzy", assists: 16, assistPrestige: 10 },
  { from: "revloki", to: "fochizzy", assists: 9, assistPrestige: 8 },
  { from: "fochizzy", to: "gregmtg", assists: 14, assistPrestige: 6 },
  { from: "gregmtg", to: "revloki", assists: 10, assistPrestige: 6 },
  { from: "lurker", to: "revloki", assists: 9, assistPrestige: 5 },
  { from: "fochizzy", to: "revloki", assists: 5, assistPrestige: 4 },
  { from: "gregmtg", to: "lurker", assists: 11, assistPrestige: 4 },
  { from: "fochizzy", to: "lurker", assists: 8, assistPrestige: 4 },
  { from: "lurker", to: "gregmtg", assists: 6, assistPrestige: 3 },
  { from: "revloki", to: "gregmtg", assists: 6, assistPrestige: 2 },
  { from: "revloki", to: "lurker", assists: 2, assistPrestige: 0 },
];

/**
 * Rating after each game the player appeared in, produced by running the app's
 * own `utils/elo.ts` `buildRatingHistory` over the games above. Frozen rather
 * than recomputed at render time so the 900-line rating engine stays out of the
 * browser bundle for a page that only needs the answer.
 */
export const PREVIEW_ELO_HISTORY: Record<PreviewPlayerId, number[]> = {
  revloki: [
    992, 992, 974, 967, 982, 1005, 1019, 1030, 1019, 1036, 1050, 1041, 1024,
    1018, 1031, 1043, 1036, 1038, 1046, 1035, 1036, 1031, 1039, 1034, 1049,
  ],
  gregmtg: [
    1008, 1019, 1037, 1045, 1040, 1017, 1003, 1004, 1017, 1000, 1001, 1006,
    1020, 1008, 1007, 1011, 1022, 1017, 1019, 1037, 1048, 1059, 1058,
  ],
  fochizzy: [
    988, 987, 977, 965, 963, 948, 958, 964, 969, 957, 944, 950, 944, 936, 921,
    921, 928, 921, 940, 937,
  ],
  lurker: [994, 991, 1004, 1001, 991, 1000, 997, 984, 970, 970, 956, 940],
};

/**
 * Prestige scored in each player's Nth turn of a game, totalled across every
 * tracked game — the shape the heatmap is built to show.
 */
export const PREVIEW_PRESTIGE_BY_OWN_ROUND: Record<PreviewPlayerId, number[]> = {
  lurker: [8, 7, 14, 16, 20, 12],
  gregmtg: [4, 14, 16, 15, 26, 31],
  fochizzy: [6, 6, 10, 18, 10, 16],
  revloki: [9, 11, 16, 16, 30, 37],
};

/**
 * Turn-by-turn prestige from the most recent four-player game, in the order the
 * turns were taken. Drives the replay chart and seeds the game-entry mock.
 */
export const PREVIEW_REPLAY_GAME: {
  /** Prestige the acting player banked on that turn. */
  turns: Array<{ playerId: PreviewPlayerId; prestige: number }>;
} = {
  turns: [
    { playerId: "gregmtg", prestige: 0 },
    { playerId: "lurker", prestige: 1 },
    { playerId: "fochizzy", prestige: 2 },
    { playerId: "revloki", prestige: 1 },
    { playerId: "gregmtg", prestige: 1 },
    { playerId: "lurker", prestige: 1 },
    { playerId: "fochizzy", prestige: 1 },
    { playerId: "revloki", prestige: 2 },
    { playerId: "gregmtg", prestige: 2 },
    { playerId: "lurker", prestige: 1 },
    { playerId: "fochizzy", prestige: 1 },
    { playerId: "revloki", prestige: 3 },
    { playerId: "gregmtg", prestige: 0 },
    { playerId: "gregmtg", prestige: 3 },
    { playerId: "lurker", prestige: 2 },
    { playerId: "revloki", prestige: 0 },
    { playerId: "fochizzy", prestige: 3 },
    { playerId: "revloki", prestige: 3 },
    { playerId: "gregmtg", prestige: 3 },
    { playerId: "lurker", prestige: 5 },
    { playerId: "fochizzy", prestige: -3 },
    { playerId: "revloki", prestige: 3 },
  ],
};
