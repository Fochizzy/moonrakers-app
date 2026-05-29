const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const analyticsSource = read(path.join("app", "analytics.tsx"));

assert.doesNotMatch(
  analyticsSource,
  /Featured View|Recent Session|Choose A View/,
  "expected the analytics landing to stay compact without the reverted featured, recent-session, or choose-a-view sections"
);

assert.doesNotMatch(
  analyticsSource,
  /Next Step|One curated lane for compare, charts, ratings, and fast league takeaways\./,
  "expected the analytics landing to keep the compact stats row and shorter hero copy"
);

assert.doesNotMatch(
  analyticsSource,
  /<StatBlock label="Players"[\s\S]*<StatBlock label="Games"[\s\S]*<StatBlock label="Views"/,
  "expected the analytics landing hero to drop the Players / Games / Views summary row"
);

assert.doesNotMatch(
  analyticsSource,
  /Counts on this screen come from Supabase analytics payloads\./,
  "expected the analytics landing hero to drop the Supabase counts helper copy"
);

assert.doesNotMatch(
  analyticsSource,
  /Open the published Moonrakers analytics surfaces from one shared command deck\./,
  "expected the analytics destinations section to drop the old deck subtitle copy"
);

assert.doesNotMatch(
  analyticsSource,
  /Counts above and readiness for this destination deck come from the shared Supabase analytics payload\./,
  "expected the analytics destinations section to drop the shared payload provenance caption"
);

const { getAnalyticsHubCards } = require("../utils/appHubs.ts");
const cards = getAnalyticsHubCards();

assert.equal(
  cards.find((card) => card.key === "compare")?.iconKey,
  "compare",
  "expected Compare to use the semantic compare icon mapping on the analytics landing"
);

assert.equal(
  cards.find((card) => card.key === "charts")?.iconKey,
  "charts",
  "expected Charts to use the semantic charts icon mapping on the analytics landing"
);

assert.equal(
  cards.find((card) => card.key === "stats")?.iconKey,
  "statistics",
  "expected Stats to use the semantic statistics icon mapping on the analytics landing"
);

assert.equal(
  cards.find((card) => card.key === "elo")?.iconKey,
  "elo",
  "expected ELO to use the semantic elo icon mapping on the analytics landing"
);

assert.equal(
  cards.find((card) => card.key === "insights")?.iconKey,
  "ships",
  "expected Insights to use the ships tile on the analytics landing"
);

const {
  CHART_SECTIONS,
} = require("../components/charts/chartCatalog.ts");

assert.equal(
  CHART_SECTIONS.find((section) => section.key === "profile")?.title,
  "Your Game",
  "expected the charts hub profile rail to be renamed to Your Game"
);

assert.equal(
  CHART_SECTIONS.find((section) => section.key === "trends")?.title,
  "Table",
  "expected the charts hub trends rail to be renamed to Table"
);

const chartsHomeSource = read(path.join("app", "charts", "index.tsx"));

assert.match(
  chartsHomeSource,
  /\.filter\(\s*\(chart\)\s*=>\s*chart\.key !== selectedChart\.key\s*\)/,
  "expected the charts home to hide the currently selected chart from its rail"
);

assert.doesNotMatch(
  chartsHomeSource,
  /label=\{setupOpen \? "Launch" : "Adjust"\}|subtitle=\{setupOpen \? "Open current chart" : undefined\}/,
  "expected the charts home sticky card to stop using the old launch state"
);

const chartDetailSource = read(path.join("app", "charts", "[chartKey].tsx"));

assert.doesNotMatch(
  chartDetailSource,
  /ChartInfoCard|takeaway=\{detailModel\.takeaway\}|Charts Home|Adjust this chart from the setup hub\./,
  "expected chart routes to drop the old detail-shell chrome and keep only a simple path back to adjust"
);

assert.match(
  chartDetailSource,
  /Back to Adjust/,
  "expected chart routes to keep a simple back-to-adjust action"
);

console.log("cinematic-intel.test.cjs passed");
