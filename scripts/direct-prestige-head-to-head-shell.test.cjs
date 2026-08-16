const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readGameScreenSource } = require("./support/game-screen-source.cjs");

const source = readGameScreenSource();

assert.match(
  source,
  /if \(!stayAtBaseSelected && !headToHeadMissionActive && !hasOutcomeSelection\) return false;/,
  "expected an active head-to-head mission to keep End Turn available without forcing a contract success or failure choice",
);

assert.match(
  source,
  /styles\.sectionCard,[\s\S]*borderColor:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.5\)\s*:\s*withAlpha\(currentAccent,\s*0\.36\),[\s\S]*backgroundColor:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.12\)\s*:\s*mixWithBlack\(currentAccent,\s*0\.84\),[\s\S]*glowStyle\(withAlpha\(headToHeadMissionActive\s*\?\s*UI\.silver\s*:\s*currentAccent,\s*0\.95\),\s*0\.16,\s*8,\s*6\)/s,
  "expected the Direct Prestige outer shell to switch into the silver head-to-head treatment when a mission is active",
);

assert.match(
  source,
  /styles\.directPrestigeFrame,[\s\S]*backgroundColor:\s*stayAtBaseSelected\s*\?\s*withAlpha\(UI\.gold,\s*0\.05\)\s*:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.12\)\s*:\s*withAlpha\(currentAccent,\s*0\.09\),[\s\S]*borderColor:\s*stayAtBaseSelected\s*\?\s*withAlpha\(UI\.gold,\s*0\.44\)\s*:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.5\)\s*:\s*withAlpha\(currentAccent,\s*0\.38\),[\s\S]*stayAtBaseSelected\s*\?\s*glowStyle\(withAlpha\(UI\.gold,\s*0\.92\),\s*0\.12,\s*6,\s*4\)\s*:\s*headToHeadMissionActive\s*\?\s*glowStyle\(withAlpha\(UI\.silver,\s*0\.88\),\s*0\.16,\s*8,\s*5\)\s*:\s*glowStyle\(withAlpha\(currentAccent,\s*0\.95\),\s*0\.1,\s*6,\s*4\)/s,
  "expected the inner Direct Prestige frame to fill the section with the same silver head-to-head treatment",
);

assert.match(
  source,
  /\{!headToHeadMissionActive \? <Text style=\{styles\.sectionTitle\}>Direct Prestige<\/Text> : null\}/,
  "expected the Direct Prestige heading to disappear once a head-to-head mission is picked",
);

assert.match(
  source,
  /styles\.headToHeadActiveBox,[\s\S]*borderColor: withAlpha\(UI\.silver, 0\.5\),[\s\S]*backgroundColor: withAlpha\(UI\.silver, 0\.12\)/,
  "expected the active Head to Head mission card to keep the silver treatment",
);

console.log("direct-prestige-head-to-head-shell.test.cjs passed");
