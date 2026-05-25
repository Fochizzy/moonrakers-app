const fs = require("fs");
const path = require("path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function expectIncludes(source, pattern, label) {
  if (!source.includes(pattern)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

run("Analytics background preset uses Rings art", () => {
  const backgroundSource = read("components/ui/ScreenBackground.tsx");

  expectIncludes(backgroundSource, 'const RINGS = require("@/assets/Rings.png");', "Rings asset import");
  expectIncludes(backgroundSource, "analytics:", "analytics preset key");
  expectIncludes(backgroundSource, "artSource: RINGS", "analytics Rings art source");
});

run("Analytics family screens opt into the analytics background preset", () => {
  const analyticsSource = read("app/analytics.tsx");
  const chartsHubSource = read("app/charts/index.tsx");
  const chartDetailSource = read("app/charts/[chartKey].tsx");
  const compareSource = read("app/charts/compare/index.tsx");
  const statsSource = read("app/stats.tsx");
  const eloSource = read("app/elo.tsx");
  const insightsSource = read("app/insights.tsx");
  const definitionsSource = read("app/definitions.tsx");

  expectIncludes(analyticsSource, '<PageShell preset="analytics"', "analytics hub preset");
  expectIncludes(chartsHubSource, '<PageShell preset="analytics"', "charts hub preset");
  expectIncludes(chartDetailSource, '<PageShell preset="analytics"', "chart detail preset");
  expectIncludes(compareSource, '<ScreenBackground preset="analytics" />', "compare preset");
  expectIncludes(statsSource, 'preset="analytics"', "stats preset");
  expectIncludes(eloSource, 'preset="analytics"', "elo preset");
  expectIncludes(insightsSource, 'preset="analytics"', "insights preset");
  expectIncludes(definitionsSource, '<PageShell preset="analytics"', "definitions preset");
});
