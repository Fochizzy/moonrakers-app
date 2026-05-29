const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "analytics.tsx"),
  "utf8"
);

assert.match(
  source,
  /compare:\s*\{\s*category:\s*"correlations"\s+as const,\s*label:\s*"What is Compare\?"\s*\}/,
  "expected Compare to expose a glossary link in the same question format as ELO"
);

assert.match(
  source,
  /charts:\s*\{\s*category:\s*"scoring"\s+as const,\s*label:\s*"What are Charts\?"\s*\}/,
  "expected Charts to expose a glossary link in the same question format as ELO"
);

assert.match(
  source,
  /stats:\s*\{\s*category:\s*"scoring"\s+as const,\s*label:\s*"What are Stats\?"\s*\}/,
  "expected Stats to switch from a plain Glossary label to the same question format as ELO"
);

assert.match(
  source,
  /elo:\s*\{\s*category:\s*"elo"\s+as const,\s*label:\s*"What is ELO\?"\s*\}/,
  "expected ELO to keep the question-format glossary link"
);

assert.match(
  source,
  /insights:\s*\{\s*category:\s*"correlations"\s+as const,\s*label:\s*"What are Insights\?"\s*\}/,
  "expected Insights to expose a glossary link in the same question format as ELO"
);

assert.match(
  source,
  /fullWidth \? \([\s\S]*DefinitionsJumpLink[\s\S]*\) : \(/,
  "expected the wide analytics card layout to render a glossary link too"
);

assert.doesNotMatch(
  source,
  /This directory stays aligned with the published Supabase analytics hub payload\./,
  "expected the analytics directory helper sentence to be removed"
);

console.log("analytics-hub-glossary-links.test.cjs passed");
