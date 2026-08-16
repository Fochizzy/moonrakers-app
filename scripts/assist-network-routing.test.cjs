const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

run("Relationship graph detail route mounts AssistNetworkOverview from unified games and exact route ids", () => {
  const detailSource = read(path.join("app", "charts", "[chartKey].tsx"));

  assert.match(
    detailSource,
    /case "relationship_graph":[\s\S]*<AssistNetworkOverview[\s\S]*games=\{unifiedGames\}[\s\S]*players=\{resolvedPlayers\}[\s\S]*scopedPlayerIds=\{routeIds.length \? routeIds : scopedPlayerIds\}[\s\S]*exactScopePlayerIds=\{routeIds.length >= 2 \? routeIds : undefined\}[\s\S]*mode=\{routeMode\}/,
    "expected the relationship_graph route to mount AssistNetworkOverview from unified games and exact route ids"
  );

  assert.doesNotMatch(
    detailSource,
    /case "relationship_graph":[\s\S]*assistMode=\{routeAssistMode\}/,
    "expected the relationship_graph route to stop passing assistMode into AssistNetworkOverview"
  );

  assert.doesNotMatch(
    detailSource,
    /case "relationship_graph":[\s\S]*<RelationshipGraph/,
    "expected the relationship_graph route to stop mounting RelationshipGraph directly"
  );
});

run("Relationship graph server renderer keeps the full assist-network overview instead of a bare graph", () => {
  const detailSource = read(path.join("app", "charts", "[chartKey].tsx"));

  assert.match(
    detailSource,
    /function renderServerChart\(\)\s*\{[\s\S]*case "relationship_graph":[\s\S]*<AssistNetworkOverview[\s\S]*games=\{relationshipGames as NormalizedGame\[\]\}[\s\S]*players=\{relationshipPlayers as ChartPlayerLike\[\]\}[\s\S]*scopedPlayerIds=\{routeIds.length \? routeIds : scopedPlayerIds\}[\s\S]*exactScopePlayerIds=\{routeIds.length >= 2 \? routeIds : undefined\}[\s\S]*mode=\{routeMode\}/,
    "expected the relationship_graph server renderer to keep mounting AssistNetworkOverview from the resolved relationship games and exact route ids"
  );

  assert.match(
    detailSource,
    /const relationshipGames = unifiedGames\.length \? unifiedGames : serverChartGames;/,
    "expected the relationship_graph server renderer to fall back to the payload's own games so a device with nothing hydrated can still render published edges"
  );

  assert.doesNotMatch(
    detailSource,
    /function renderServerChart\(\)\s*\{[\s\S]*case "relationship_graph":[\s\S]*renderServerRelationshipGraph\(\)/,
    "expected the relationship_graph server renderer to stop delegating to the bare server relationship graph helper"
  );
});

run("Insights stops owning a duplicate assist network section", () => {
  const insightsSource = read(path.join("app", "insights.tsx"));

  assert.doesNotMatch(
    insightsSource,
    /import AssistNetworkOverview from/,
    "expected insights to drop the AssistNetworkOverview import"
  );

  assert.doesNotMatch(
    insightsSource,
    /<AssistNetworkOverview/,
    "expected insights to stop owning a duplicate AssistNetworkOverview section"
  );
});
