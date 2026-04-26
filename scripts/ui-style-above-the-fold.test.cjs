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

function expectNotIncludes(source, pattern, label) {
  if (source.includes(pattern)) {
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

run("PageShell supports compact and fit layouts", () => {
  const source = read("components/ui/PageShell.tsx");

  expectIncludes(source, 'density?: "default" | "compact"', "density prop");
  expectIncludes(source, 'viewport?: "scroll" | "fit"', "viewport prop");
});

run("Auth screens opt into the compact above-the-fold shell", () => {
  const loginSource = read("app/login.tsx");
  const registerSource = read("app/register.tsx");
  const resetSource = read("app/reset-password.tsx");

  expectIncludes(loginSource, 'density="compact"', "compact login shell");
  expectIncludes(loginSource, 'viewport="fit"', "fit login shell");
  expectNotIncludes(
    loginSource,
    "One registered host can launch a table and add other registered players by player name.",
    "long login explainer"
  );

  expectIncludes(registerSource, 'density="compact"', "compact register shell");
  expectIncludes(registerSource, 'viewport="fit"', "fit register shell");
  expectNotIncludes(
    registerSource,
    "Choose your command color. Moonrakers will assign the matching default card at signup.",
    "long register color explainer"
  );

  expectIncludes(resetSource, 'density="compact"', "compact reset shell");
  expectIncludes(resetSource, 'viewport="fit"', "fit reset shell");
  expectNotIncludes(resetSource, 'subtitle="Set a new password."', "reset header subtitle");
  expectNotIncludes(
    resetSource,
    'subtitle="Use the recovery link from your email."',
    "reset section subtitle"
  );
});

run("Primary hubs opt into compact framing", () => {
  const indexSource = read("app/index.tsx");
  const analyticsSource = read("app/analytics.tsx");
  const playersSource = read("app/players.tsx");

  expectIncludes(indexSource, 'density="compact"', "compact home shell");
  expectNotIncludes(
    indexSource,
    'subtitle="Tap to select. Hold to open a profile."',
    "command player explainer subtitle"
  );

  expectIncludes(analyticsSource, 'density="compact"', "compact analytics shell");

  expectIncludes(playersSource, 'density="compact"', "compact players shell");
  expectNotIncludes(
    playersSource,
    "Manage identities, browse profiles, and reopen the people surface you were using most recently.",
    "players hero explainer"
  );
  expectNotIncludes(
    playersSource,
    "A small working-memory card so this hub feels active instead of purely navigational.",
    "players resume explainer"
  );
  expectNotIncludes(
    playersSource,
    "Roster work, profile browsing, and card scanning now live under one consistent players hub.",
    "players hub explainer"
  );
});

if (process.exitCode > 0) {
  throw new Error("ui-style-above-the-fold.test.cjs failed");
}

console.log("ui-style-above-the-fold.test.cjs passed");
