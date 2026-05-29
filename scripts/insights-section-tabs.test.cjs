const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const screenSource = fs.readFileSync(
  path.join(projectRoot, "app", "insights.tsx"),
  "utf8"
);
const correlationSource = fs.readFileSync(
  path.join(projectRoot, "components", "CorrelationStats.tsx"),
  "utf8"
);

assert.match(
  screenSource,
  /const \[activeSectionTab,\s*setActiveSectionTab\][\s\S]*?useState<InsightSectionTab>\("pairingCorrelations"\);/,
  "expected insights screen to keep Personal Correlations as the default section"
);

assert.match(
  screenSource,
  /label: ["']Personal Correlations["'][\s\S]*label: ["']Macro Correlations["'][\s\S]*label: ["']Top Synergy Pairs["']/,
  "expected insights screen to relabel the pairing tab to Personal Correlations"
);

assert.match(
  screenSource,
  /shortLabel: ["']Personal["'][\s\S]*shortLabel: ["']Macro["'][\s\S]*shortLabel: ["']Synergy["']/,
  "expected the insights focus rail to use one-line short labels for Personal, Macro, and Synergy"
);

assert.match(
  screenSource,
  /<AnalyticsControlRail[\s\S]*title="Focus"[\s\S]*tabVariant="underline"/,
  "expected the insights screen to render the insight controls as a lighter focus rail"
);

assert.match(
  screenSource,
  /search=\{[\s\S]*variant:\s*"rail"/,
  "expected the insights focus rail to use the compact player search rail variant"
);

assert.doesNotMatch(
  screenSource,
  /Switch between the published correlation lenses without leaving this route\.|Pick the player whose server-authored correlation reads you want to inspect\./,
  "expected the old Insight Lenses helper copy to be removed from the live insights screen"
);

assert.doesNotMatch(
  screenSource,
  /label: ["']Global Meta["']|title=["']Global Meta["']|activeSectionTab === ["']globalMeta["']|label: ["']Individual Insights["']|title=["']Individual Insights["']|activeSectionTab === ["']individualInsights["']/,
  "expected the dedicated Global Meta and Individual Insights tabs and panels to be removed from the insights screen"
);

assert.match(
  screenSource,
  /activeSectionTab === ["']pairingCorrelations["'][\s\S]*<CorrelationStats[\s\S]*view="pairing"/,
  "expected the Personal Correlations tab to keep rendering only the pairing view"
);

assert.match(
  correlationSource,
  /title=["']Personal Correlations["']/,
  "expected the pairing correlations panel title to be relabeled to Personal Correlations"
);

assert.match(
  screenSource,
  /activeSectionTab === ["']macroCorrelations["'][\s\S]*<CorrelationStats[\s\S]*view="macro"/,
  "expected Macro Correlations tab to render only the macro view"
);

assert.match(
  screenSource,
  /activeSectionTab === ["']topSynergyPairs["'][\s\S]*<CorrelationStats[\s\S]*view="synergy"/,
  "expected Top Synergy Pairs tab to render only the synergy view"
);

assert.match(
  correlationSource,
  /view\?: 'all' \| 'pairing' \| 'macro' \| 'synergy';/,
  "expected CorrelationStats to accept a scoped section view prop"
);

assert.match(
  correlationSource,
  /const showOverviewChrome = view === 'all';/,
  "expected CorrelationStats to hide the big hero chrome when rendering a single tab view"
);

console.log("insights-section-tabs.test.cjs passed");
