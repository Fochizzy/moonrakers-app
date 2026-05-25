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

let failures = 0;

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

run("Non-game TypeScript surfaces use the current option and color contracts", () => {
  const layoutSource = read("app/_layout.tsx");
  const manageSource = read("app/manage-players-groups.tsx");
  const cardSource = read("components/ColorPlayerCard.tsx");

  assert.equal(
    layoutSource.includes("headerBackTitleVisible"),
    false,
    "Expected app/_layout.tsx to stop using headerBackTitleVisible"
  );
  assert.ok(
    manageSource.includes("Redirect"),
    "Expected manage-players-groups.tsx to redirect instead of rendering local management"
  );
  assert.ok(
    manageSource.includes("APP_ROUTES.roster"),
    "Expected manage-players-groups.tsx to redirect to APP_ROUTES.roster"
  );

  assert.equal(
    cardSource.includes("raw?.muted"),
    false,
    "Expected ColorPlayerCard to stop reading raw?.muted from getPlayerColors"
  );
  assert.ok(
    cardSource.includes("raw?.subtext"),
    "Expected ColorPlayerCard to use the current subtext color contract"
  );
});

run("Player identity helpers export the surface consumed by player cards and radar views", () => {
  const playerIdentitySource = read("utils/playerIdentity.ts");

  assert.ok(
    playerIdentitySource.includes("export type PlayerIdentityInput"),
    "Expected playerIdentity.ts to export PlayerIdentityInput"
  );
  assert.ok(
    playerIdentitySource.includes("export type IdentityAxis"),
    "Expected playerIdentity.ts to export IdentityAxis"
  );
  assert.ok(
    playerIdentitySource.includes("export function buildPlayerIdentity"),
    "Expected playerIdentity.ts to export buildPlayerIdentity"
  );

  const { buildPlayerIdentity } = require("../utils/playerIdentity.ts");

  assert.equal(typeof buildPlayerIdentity, "function");

  const identity = buildPlayerIdentity({
    name: "Nova Vale",
    title: "Captain",
    color: "blue",
    wins: 4,
    gamesPlayed: 8,
    totalPrestige: 42,
    directPrestige: 25,
    assistPrestigeReceived: 10,
    assists: 7,
    contractsSucceeded: 12,
    contractsFailed: 2,
    objectivesCompleted: 5,
  });

  assert.equal(identity.displayName, "Nova Vale");
  assert.equal(typeof identity.subtitle, "string");
  assert.equal(typeof identity.archetype, "string");
  assert.equal(typeof identity.summaryText, "string");
  assert.equal(identity.axes.length, 6);
  assert.ok(
    identity.axes.every(
      (axis) =>
        typeof axis.label === "string" &&
        typeof axis.adjective === "string" &&
        typeof axis.description === "string" &&
        typeof axis.gameplayMeaning === "string" &&
        typeof axis.value === "number"
    ),
    "Expected every identity axis to expose label, adjective, description, gameplayMeaning, and value"
  );
});

if (failures > 0) {
  process.exitCode = 1;
}
