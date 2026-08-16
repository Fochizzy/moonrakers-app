import assert from "node:assert/strict";

import { hasMissingRoundByRoundDetail } from "../utils/roundDetailAvailability.ts";

assert.equal(
  hasMissingRoundByRoundDetail({
    totals: {
      alpha: { totalPrestige: 14 },
      bravo: { totalPrestige: 12 },
    },
    rounds: [
      { prestige: 0 },
      { prestige: 0, objectivePrestige: 1 },
    ],
  }),
  true,
  "positive final totals with no recorded round prestige identify the affected imports",
);

assert.equal(
  hasMissingRoundByRoundDetail({
    totals: {
      alpha: { totalPrestige: 14 },
    },
    rounds: [{ prestige: 3 }],
  }),
  false,
  "a game with recorded round prestige must not be labelled as missing detail",
);

assert.equal(
  hasMissingRoundByRoundDetail({
    totals: {
      alpha: { totalPrestige: 0 },
    },
    rounds: [{ prestige: 0 }],
  }),
  false,
  "a genuine zero-prestige game must not be labelled as an import",
);

console.log("round-detail-availability.test.ts passed");
