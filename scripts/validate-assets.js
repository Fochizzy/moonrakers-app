const fs = require("fs");
const path = require("path");

const requiredIcons = [
  "Green.png",
  "Hazard_Die.png",
  "Mission Card.png",
  "Mission.png",
  "Money.png",
  "Objective.png",
  "Prestige.png",
  "Purple.png",
  "Yellow.png",
  "add_remove.png",
  "charts.png",
  "compare.png",
  "definitions.png",
  "elo.png",
  "full_profile.png",
  "history.png",
  "player_card.png",
  "statistics.png",
];

const requiredPlayerCards = Array.from({ length: 30 }, (_, i) =>
  `card-${String(i).padStart(2, "0")}.png`
);

function validateGroup(baseDir, files, label) {
  const missing = files.filter((file) => !fs.existsSync(path.join(baseDir, file)));

  if (missing.length) {
    console.error(`\nMissing ${label}:`);
    missing.forEach((file) => console.error(` - ${file}`));
    process.exitCode = 1;
  } else {
    console.log(`✓ ${label} OK`);
  }
}

validateGroup(path.join(__dirname, "..", "assets", "icons"), requiredIcons, "icons");
validateGroup(
  path.join(__dirname, "..", "assets", "images", "player-cards"),
  requiredPlayerCards,
  "player cards"
);

if (process.exitCode !== 1) {
  console.log("\nAll required assets exist.");
}
