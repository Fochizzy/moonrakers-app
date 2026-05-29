import assert from "node:assert/strict";

import { buildAssistNetworkInterpretation } from "../components/charts/AssistNetworkOverview/buildAssistNetworkInterpretation.ts";

function main() {
  const exactLines = buildAssistNetworkInterpretation({
    playerCount: 4,
    linkCount: 9,
    sampleGameCount: 6,
    exactScopeApplied: true,
    hubName: "GregMTG",
    hubValue: 2.4,
    netGiverName: "/Loki",
    netGiverValue: -0.3,
    netReceiverName: "Fochi",
    netReceiverValue: 0.5,
    topLinkLabel: "Corey -> Fochi",
    topLinkValue: "0.6/game",
  });

  assert.equal(exactLines.length, 5);
  assert.equal(
    exactLines[0],
    "This view maps 4 players and 9 directed links across 6 exact-match games, so denser clusters point to the most active assist traffic in the table."
  );
  assert.equal(
    exactLines[1],
    "GregMTG is the current hub at 2.4 total involvement, which means more of the table's assist flow runs through them than anyone else."
  );
  assert.equal(
    exactLines[2],
    "/Loki is the biggest net giver at -0.3, so they send more support outward than they take back in this sample."
  );
  assert.equal(
    exactLines[3],
    "Fochi is the biggest net receiver at +0.5, which signals that more value is flowing toward them from teammates overall."
  );
  assert.equal(
    exactLines[4],
    "The strongest visible lane is Corey -> Fochi at 0.6/game, and the edge labels are per-game rates, so recurring habits matter more here than one-off totals."
  );

  const filteredLines = buildAssistNetworkInterpretation({
    playerCount: 3,
    linkCount: 4,
    sampleGameCount: 8,
    exactScopeApplied: false,
    hubName: "Corey",
    hubValue: 1.7,
    netGiverName: "GregMTG",
    netGiverValue: -0.2,
    netReceiverName: "Corey",
    netReceiverValue: 0.4,
    topLinkLabel: "GregMTG -> Corey",
    topLinkValue: "0.4/game",
  });

  assert.match(filteredLines[0], /across 8 filtered games/);
}

try {
  main();
  console.log("assist-network-interpretation.test.ts passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
