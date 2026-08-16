const assert = require("node:assert/strict");
const { readGameScreenSource } = require("./support/game-screen-source.cjs");

const source = readGameScreenSource();

assert.match(
  source,
  /prestigeStepperButton:\s*\{[\s\S]*width:\s*38,[\s\S]*height:\s*38,/,
  "expected the Direct Prestige stepper buttons to shrink a bit so the hero scoring block carries less visual weight",
);

assert.match(
  source,
  /prestigeCenterWrap:\s*\{[\s\S]*width:\s*96,[\s\S]*height:\s*44,/,
  "expected the Direct Prestige value container to get slightly smaller for a more conservative first card",
);

assert.match(
  source,
  /prestigeValueBox:\s*\{[\s\S]*width:\s*96,[\s\S]*height:\s*44,/,
  "expected the Direct Prestige value pill to match the reduced compact size",
);

assert.match(
  source,
  /contractButton:\s*\{[\s\S]*height:\s*42,/,
  "expected the contract result buttons to get a little shorter so they stop dominating the screen",
);

assert.match(
  source,
  /contractLabel:\s*\{[\s\S]*fontSize:\s*10,/,
  "expected the contract labels to use the more compact text size",
);

assert.match(
  source,
  /styles\.playerRowCard,\s*!assistOn && styles\.playerRowCardQuiet/s,
  "expected inactive assist rows to opt into a quieter card treatment",
);

assert.match(
  source,
  /styles\.assistNameWrap,\s*!assistOn && styles\.assistNameWrapQuiet/s,
  "expected inactive assist rows to calm the player-name capsule too",
);

assert.match(
  source,
  /<Text style=\{\[styles\.playerRowTitle,\s*!assistOn && styles\.playerRowTitleQuiet\]\}>/,
  "expected inactive assist rows to soften the row title text",
);

assert.match(
  source,
  /playerRowCardQuiet:\s*\{[\s\S]*backgroundColor:\s*UI\.cardMuted,[\s\S]*borderColor:\s*UI\.line,[\s\S]*opacity:\s*0\.92,/,
  "expected the quiet assist-row card style to neutralize chrome rather than redesign the row",
);

assert.match(
  source,
  /assistNameWrapQuiet:\s*\{[\s\S]*backgroundColor:\s*UI\.cardMuted,[\s\S]*borderColor:\s*UI\.line,/,
  "expected the quiet assist-name style to pull inactive rows back toward the shared neutral palette",
);

assert.match(
  source,
  /playerRowTitleQuiet:\s*\{[\s\S]*color:\s*UI\.textMuted,/,
  "expected inactive assist row titles to soften to the muted text color",
);

assert.match(
  source,
  /const isEmphasized = isCurrentPlayer \|\| value > 0;/,
  "expected the objectives list to explicitly distinguish emphasized rows from calmer non-active rows",
);

assert.match(
  source,
  /styles\.objectiveRowCard,\s*!isEmphasized && styles\.objectiveRowCardQuiet/s,
  "expected quieter objective rows when they are neither the current player nor carrying awarded value",
);

assert.match(
  source,
  /styles\.objectiveNameWrap,\s*!isEmphasized && styles\.objectiveNameWrapQuiet/s,
  "expected calmer objective-name capsules on non-active rows",
);

assert.match(
  source,
  /<Text style=\{\[styles\.objectiveName,\s*!isEmphasized && styles\.objectiveNameQuiet\]\}>/,
  "expected non-active objective labels to soften their text weight",
);

assert.match(
  source,
  /objectiveRowCardQuiet:\s*\{[\s\S]*backgroundColor:\s*UI\.cardMuted,[\s\S]*borderColor:\s*UI\.line,[\s\S]*opacity:\s*0\.92,/,
  "expected the quiet objective-row style to stay conservative by muting the existing card",
);

assert.match(
  source,
  /objectiveNameWrapQuiet:\s*\{[\s\S]*backgroundColor:\s*UI\.cardMuted,[\s\S]*borderColor:\s*UI\.line,/,
  "expected the quiet objective-name style to reuse the neutral chip look",
);

assert.match(
  source,
  /objectiveNameQuiet:\s*\{[\s\S]*color:\s*UI\.textMuted,/,
  "expected non-active objective labels to use the muted text color",
);

console.log("game-screen-density-polish.test.cjs passed");
