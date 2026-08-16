const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readGameScreenSource } = require("./support/game-screen-source.cjs");

const source = readGameScreenSource();

assert.match(
  source,
  /appRoutes/,
  "expected the game screen to import the shared app route helpers for Command navigation",
);

assert.match(
  source,
  /<View\s+style=\{\[\s*styles\.heroStickyShell,[\s\S]*<Pressable[\s\S]*router\.push\(buildHomeRoute\(\)\)[\s\S]*>Command<[\s\S]*<\/View>\s*<ScrollView/s,
  "expected the game screen to render a sticky hero shell above the main ScrollView with a Command button",
);

assert.doesNotMatch(
  source,
  /Back to Command/,
  "expected the sticky game header action copy to drop the Back to wording and just say Command",
);

assert.doesNotMatch(
  source,
  /heroHeaderSpacer/,
  "expected the sticky game header to stop reserving a blank spacer ahead of the active player copy",
);

assert.ok(
  source.includes("<View style={styles.heroTopRow}>") &&
    source.includes("<View style={styles.heroHeaderCopy}>") &&
    source.includes("styles.roundBadge"),
  "expected the sticky game header to keep the round badge and hero copy nested inside the hero top row",
);

assert.ok(
  source.includes("styles.nameBadge") &&
    source.includes("{currentPlayer.name}"),
  "expected the sticky game header hero copy to include the active player name badge",
);

assert.ok(
  source.includes("style={styles.commandButton}") &&
    source.includes("router.push(buildHomeRoute())") &&
    source.includes("<Text style={styles.commandButtonText}>Command</Text>"),
  "expected the sticky game header to keep the Command action on the right side of the hero top row",
);

assert.match(
  source,
  /<Text[\s\S]*style=\{styles\.nameBadgeText\}[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.75\}[\s\S]*>\s*\{currentPlayer\.name\}/,
  "expected the active player name in the sticky game header to stay on one line and shrink to fit",
);

assert.match(
  source,
  /heroHeaderCopy:\s*\{[\s\S]*alignItems:\s*'center',/,
  "expected the sticky game header copy column to keep its labels centered",
);

assert.match(
  source,
  /heroStickyShell:\s*\{[\s\S]*zIndex:\s*4,[\s\S]*paddingHorizontal:\s*8,[\s\S]*paddingBottom:\s*8,/,
  "expected the sticky game hero shell to reserve top space and stay visually above the scrolling content",
);

assert.match(
  source,
  /commandButton:\s*\{[\s\S]*alignSelf:\s*'flex-start',[\s\S]*borderRadius:\s*8,/,
  "expected the game screen to define a compact top-right command button style",
);

assert.match(
  source,
  /roundBadgeText:\s*\{[\s\S]*fontSize:\s*10,[\s\S]*fontWeight:\s*'700',/,
  "expected the sticky game header round label to use the smaller compact text size",
);

assert.match(
  source,
  /commandButtonText:\s*\{[\s\S]*fontSize:\s*10,[\s\S]*fontWeight:\s*'700',/,
  "expected the Command label to use the smaller compact text size",
);

console.log("game-sticky-header-command-link.test.cjs passed");
