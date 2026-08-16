const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("./support/ts-require.cjs");

const {
  buildTotals,
  createRound,
} = require("../engine/gameEngine.ts");
const {
  buildCompletedGamePayload,
} = require("../lib/game-save/buildCompletedGamePayload.ts");

const createdRound = createRound("greg", {
  prestige: 1,
  contracts: 1,
  failures: 0,
  assistRecipients: { corey: 1 },
  assistPrestigeRecipients: { corey: -1 },
  objectiveCount: 0,
});

assert.deepEqual(
  createdRound.assistPrestigeRecipients,
  { corey: 0 },
  "new rounds must clamp received assist prestige at zero",
);

const totals = buildTotals(
  [{ ...createdRound, assistPrestigeRecipients: { corey: -1 } }],
  [
    { id: "greg", name: "Greg" },
    { id: "corey", name: "Corey" },
  ],
);

assert.equal(
  totals.corey.assistPrestigeReceived,
  0,
  "totals must not propagate negative assist prestige from a malformed round",
);
assert.equal(
  totals.greg.assistPrestigeSent,
  0,
  "sender totals must use the same nonnegative assist prestige",
);

const payload = buildCompletedGamePayload({
  hostProfileId: "00000000-0000-4000-8000-000000000001",
  activeGame: {
    id: "00000000-0000-4000-8000-000000000010",
    players: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Corey",
      },
    ],
    totals: {
      "00000000-0000-4000-8000-000000000002": {
        assistPrestigeReceived: -1,
      },
    },
    rounds: [
      {
        playerId: "00000000-0000-4000-8000-000000000001",
        assistRecipients: {
          "00000000-0000-4000-8000-000000000002": 1,
        },
        assistPrestigeRecipients: {
          "00000000-0000-4000-8000-000000000002": -1,
        },
      },
    ],
  },
});

assert.equal(payload.participants[0].assist_prestige_received, 0);
assert.deepEqual(payload.rounds[0].assist_prestige_recipients, {
  "00000000-0000-4000-8000-000000000002": 0,
});

const gameSource = fs.readFileSync(
  path.resolve(__dirname, "..", "app", "game.tsx"),
  "utf8",
);
const assistSource = fs.readFileSync(
  path.resolve(__dirname, "..", "components", "game", "AssistSection.tsx"),
  "utf8",
);

assert.match(
  gameSource,
  /\[playerId\]: Math\.max\(0, toNumber\(value\)\)/,
  "the game-state handler must reject negative assist prestige",
);
assert.match(
  assistSource,
  /disabled=\{!assistOn \|\| assistPrestige <= 0\}/,
  "the decrement control must stop at zero",
);

console.log("assist-prestige-nonnegative.test.cjs passed");
