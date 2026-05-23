const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function expectIncludes(source, pattern, label) {
  if (!source.includes(pattern)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

function expectMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

function expectNotMatches(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`Unexpected ${label}: ${pattern}`);
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

run("PageShell preserves page overrides while still applying safe-area padding", () => {
  const source = read("components/ui/PageShell.tsx");

  expectIncludes(
    source,
    "StyleSheet.flatten(contentContainerStyle)",
    "flattened page shell content style"
  );
  expectIncludes(source, "resolvePaddingValue(", "padding resolver helper");
  expectMatches(source, /paddingTop:\s*resolvedPaddingTop \+ insets\.top/, "top inset merge");
  expectMatches(
    source,
    /paddingBottom:\s*resolvedPaddingBottom \+ insets\.bottom/,
    "bottom inset merge"
  );
});

run("Legacy full-screen routes use react-native-safe-area-context", () => {
  const safeAreaRoutes = [
    "app/add-players.tsx",
    "app/charts/compare/index.tsx",
    "app/elo.tsx",
    "app/history.tsx",
    "app/player-profile/[playerId].tsx",
    "app/PlayerProfileScreen.tsx",
  ];

  for (const relPath of safeAreaRoutes) {
    const source = read(relPath);
    expectMatches(
      source,
      /from ["']react-native-safe-area-context["']/,
      `${relPath} safe-area-context import`
    );
    expectNotMatches(
      source,
      /SafeAreaView[\s\S]*from ["']react-native["']/,
      `${relPath} legacy react-native SafeAreaView import`
    );
  }
});

run("Custom scroll screens add both top and bottom inset breathing room", () => {
  const insetScreens = [
    "app/game.tsx",
    "app/game-trends.tsx",
    "app/insights.tsx",
    "app/player-cards.tsx",
    "app/player-profile/index.tsx",
    "app/stats.tsx",
    "app/summary.tsx",
  ];

  for (const relPath of insetScreens) {
    const source = read(relPath);
    expectIncludes(source, "useSafeAreaInsets", `${relPath} inset hook`);
    expectIncludes(source, "insets.top", `${relPath} top inset usage`);
    expectIncludes(source, "insets.bottom", `${relPath} bottom inset usage`);
  }
});

run("Players and groups screen protects the bottom edge as well", () => {
  const source = read("app/add-players.tsx");
  expectMatches(
    source,
    /edges=\{\[[^\]]*"top"[^\]]*"bottom"[^\]]*\]\}/,
    "bottom edge safe-area coverage"
  );
});

if (process.exitCode > 0) {
  throw new Error("safe-area-route-regression.test.cjs failed");
}

console.log("safe-area-route-regression.test.cjs passed");
