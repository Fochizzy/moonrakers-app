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

run("Finish-profile flow routes into Add Players with a lightweight card-selection handoff", () => {
  const registerSource = read("app/register.tsx");
  const addPlayersSource = read("app/add-players.tsx");

  expectIncludes(
    registerSource,
    'viewport={needsProfileOnly ? "scroll" : "fit"}',
    "scroll-safe finish profile shell"
  );
  expectIncludes(
    registerSource,
    "pathname: APP_ROUTES.roster",
    "finish profile redirect target"
  );
  expectIncludes(
    registerSource,
    'profileSetup: "1"',
    "finish profile route handoff flag"
  );

  expectIncludes(
    addPlayersSource,
    "useLocalSearchParams",
    "add players route param reader"
  );
  expectIncludes(
    addPlayersSource,
    "profileSetup",
    "add players profile setup flag handling"
  );
  expectIncludes(
    addPlayersSource,
    'setTab("players")',
    "profile setup forces players tab"
  );
  expectIncludes(
    addPlayersSource,
    "Pick one of the matching card styles for your selected color, then save changes.",
    "profile setup card-selection guidance"
  );
});

if (process.exitCode > 0) {
  throw new Error("profile-setup-handoff.test.cjs failed");
}

console.log("profile-setup-handoff.test.cjs passed");
