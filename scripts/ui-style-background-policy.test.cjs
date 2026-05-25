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

function expect(condition, label) {
  if (!condition) {
    throw new Error(label);
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

run("ScreenBackground uses the new art policy", () => {
  const source = read("components/ui/ScreenBackground.tsx");

  expectIncludes(
    source,
    'const BACKGROUND_ALT = require("@/assets/Background 2.png");',
    "Background 2 asset import"
  );
  expectIncludes(
    source,
    'const AUTH_BACKGROUND = require("@/assets/Background.png");',
    "Background auth asset import"
  );
  expectIncludes(
    source,
    'const MOONRISE = require("@/assets/Moonrise.png");',
    "Moonrise asset import"
  );
  expectIncludes(source, 'const RINGS = require("@/assets/Rings.png");', "Rings asset import");
  expectIncludes(source, 'detail: "detail"', "detail background preset");
  expectIncludes(source, 'launch: "launch"', "launch background preset");
  expectIncludes(source, "quiet: {", "quiet preset");
  expectIncludes(source, "command: {", "command preset");
  expectIncludes(source, "archive: {", "archive preset");
  expectIncludes(source, "database: {", "database preset");
  expectIncludes(source, "intel: {", "intel preset");
  expectIncludes(source, "detail: {", "detail preset config");
  expectIncludes(source, "launch: {", "launch preset config");
  expectIncludes(source, "artSource: BACKGROUND_ALT", "default functional background");
  expectIncludes(source, "artSource: MOONRISE", "detail background family");
  expectIncludes(source, "artSource: RINGS", "analytics background family");
});

run("HubTileCard allows selective icon use", () => {
  const source = read("components/ui/HubTileCard.tsx");

  expect(
    /iconKey\?:\s*AppIconKey\s*\|\s*null/.test(source),
    "expected HubTileCard to make iconKey optional or nullable"
  );
  expect(
    source.includes("{iconKey ? (") || source.includes("{iconKey ?("),
    "expected HubTileCard to render icons conditionally"
  );
});

run("Hub copy stays short enough for graphic-first tiles", () => {
  const source = read("utils/appHubs.ts");
  const matches = [...source.matchAll(/description:\s*"([^"]+)"/g)].map((match) => match[1]);

  expect(matches.length >= 6, "expected to find hub descriptions");

  for (const description of matches) {
    const wordCount = description.split(/\s+/).filter(Boolean).length;
    expect(
      wordCount <= 5,
      `expected hub description to stay at 5 words or fewer: "${description}"`
    );
  }
});

if (process.exitCode > 0) {
  throw new Error("ui-style-background-policy.test.cjs failed");
}

console.log("ui-style-background-policy.test.cjs passed");
