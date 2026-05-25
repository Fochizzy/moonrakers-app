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

run("Legacy full-screen routes keep an explicit safe-area wrapper", () => {
  const safeAreaRoutes = [
    "app/add-players.tsx",
    "app/charts/compare/index.tsx",
    "app/elo.tsx",
    "app/history.tsx",
    "app/player-profile/[playerId].tsx",
  ];

  for (const relPath of safeAreaRoutes) {
    const source = read(relPath);
    expectIncludes(source, "SafeAreaView", `${relPath} SafeAreaView usage`);
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
