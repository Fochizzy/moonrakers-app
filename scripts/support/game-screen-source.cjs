// The live game screen is app/game.tsx plus the presentational sections in
// components/game/. Guards that assert on "the game screen" should read this
// combined surface rather than a single file, so moving a section between them
// is a refactor and not a test failure.
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..");
const componentsDir = path.join(projectRoot, "components", "game");

function readGameScreenFiles() {
  const files = [path.join(projectRoot, "app", "game.tsx")];

  for (const entry of fs.readdirSync(componentsDir).sort()) {
    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path.join(componentsDir, entry));
    }
  }

  return files;
}

function readGameScreenSource() {
  return readGameScreenFiles()
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

module.exports = { readGameScreenFiles, readGameScreenSource, projectRoot };
