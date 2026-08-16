const assert = require("node:assert/strict");

const { readGameScreenSource } = require("./support/game-screen-source.cjs");

const source = readGameScreenSource();

// End Turn must enable when the required fields are complete regardless of tap
// order. Two defects allowed order-dependence before: the gate read only the
// synced draft while the chips rendered local state, and updateGameplay
// silently dropped writes made before the draft existed.

assert.match(
  source,
  /const hasOutcomeSelection =\s*current\.contracts === 1 \|\|\s*current\.failures === 1 \|\|\s*contractChoice === 1 \|\|\s*failureChoice === 1;/,
  "expected the End Turn gate to accept an outcome from either the synced draft or the local tap state",
);

assert.match(
  source,
  /const latestCurrentRef = useRef<CurrentTurnStats>\(current\);/,
  "expected the game screen to track the latest committed turn state in a ref",
);

assert.match(
  source,
  /if \(latestCurrentRef\.current !== current\) \{\s*commitGameplayPatch\(\{ current: latestCurrentRef\.current \}\);/,
  "expected pending taps to flush into the draft once it exists",
);

assert.match(
  source,
  /buildSubmitRoundCandidate\(\{\s*activeTurnPlayerId: activeTurnPlayer\.id,\s*current: latestCurrentRef\.current,/,
  "expected the saved round to be built from the same merged state the gate trusts",
);

assert.match(
  source,
  /buildEditRoundCandidate\(\{\s*editingRoundId,\s*current: latestCurrentRef\.current,/,
  "expected edited rounds to be built from the same merged state the gate trusts",
);

console.log("end-turn-order-independence.test.cjs passed");
