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

run("Auth bootstrap reloads the registered directory into the shared player store", () => {
  const layoutSource = read("app/_layout.tsx");

  expectIncludes(layoutSource, "loadRegisteredProfiles", "registered profile loader import");
  expectIncludes(
    layoutSource,
    "mergeRegisteredProfilesIntoPlayers",
    "registered profile player merge helper",
  );
});

run("Command and player directory surfaces still read from the shared player store", () => {
  const homeSource = read("app/index.tsx");
  const playerDirectorySource = read("app/player-profile/index.tsx");

  expectIncludes(homeSource, "const rawPlayers = usePlayers()", "home players selector");
  expectIncludes(playerDirectorySource, "const rawPlayers = usePlayers()", "player directory players selector");
  expectIncludes(playerDirectorySource, "const rawGroups = useGroups()", "player directory groups selector");
  expectIncludes(
    playerDirectorySource,
    "canonicalizeSelectablePlayers(rawPlayers, rawGroups)",
    "player directory canonical player collapse",
  );
});
