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

run("Home route uses the restored cinematic shell", () => {
  const indexSource = read("app/index.tsx");

  expectIncludes(indexSource, 'from "@/components/ui/PageShell"', "home PageShell import");
  expectIncludes(indexSource, 'from "@/components/ui/AppHeader"', "home AppHeader import");
  expectIncludes(indexSource, 'from "@/components/ui/SegmentedControl"', "home SegmentedControl import");
  expectIncludes(indexSource, 'from "@/components/ui/HubTileCard"', "home HubTileCard import");
  expectIncludes(
    indexSource,
    "Tap to select or remove. Hold to open a profile.",
    "command player hint",
  );
  expectIncludes(indexSource, 'eyebrow="Mission Prep"', "mission prep section");
  expectIncludes(indexSource, "commandPlayerViewport", "fixed player viewport");
  expectIncludes(indexSource, "showInitial={false}", "command player cards hide initials");
});

run("Shared auth header keeps the emblem identity", () => {
  const appHeaderSource = read("components/ui/AppHeader.tsx");
  const loginSource = read("app/login.tsx");
  const screenBackgroundSource = read("components/ui/ScreenBackground.tsx");

  expectIncludes(appHeaderSource, "Header_2.png", "header emblem asset");
  expectIncludes(screenBackgroundSource, "Background.png", "auth background asset");
  expectIncludes(screenBackgroundSource, 'artVariant: "fill"', "auth background fill treatment");
  expectIncludes(loginSource, "One registered host can launch a table", "login explainer");
  expectIncludes(loginSource, "Create account", "login create account action");
  expectIncludes(loginSource, "Resend confirmation email", "login resend action");
  expectIncludes(loginSource, "Reset password email", "login reset action");
});

run("Home shell uses the shared Background art for the three main tabs", () => {
  const indexSource = read("app/index.tsx");
  const screenBackgroundSource = read("components/ui/ScreenBackground.tsx");

  expectIncludes(indexSource, 'preset="command"', "home shell command preset");
  expectIncludes(screenBackgroundSource, "command:", "command preset key");
  expectIncludes(screenBackgroundSource, "artSource: AUTH_BACKGROUND", "command preset shared background art");
  expectIncludes(screenBackgroundSource, 'artVariant: "fill"', "command preset fill treatment");
});

run("Game setup route keeps the restored setup shell", () => {
  const setupSource = read("app/game-setup.tsx");

  expectIncludes(setupSource, 'from "@/components/ui/PageShell"', "setup PageShell import");
  expectIncludes(setupSource, 'from "@/components/ui/AppHeader"', "setup AppHeader import");
  expectIncludes(setupSource, 'from "@/components/ui/ActionButton"', "setup ActionButton import");
  expectIncludes(setupSource, 'title="Create Game"', "setup header title");
  expectIncludes(setupSource, "First Captain", "setup first captain marker");
  expectIncludes(setupSource, "Set the first captain and lock the table order.", "setup subtitle");
});
