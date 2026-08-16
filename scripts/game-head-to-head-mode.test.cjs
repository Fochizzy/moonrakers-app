const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readGameScreenSource } = require("./support/game-screen-source.cjs");

const source = readGameScreenSource();

assert.match(
  source,
  /if \(!stayAtBaseSelected && !headToHeadMissionActive && !hasOutcomeSelection\) return false;/,
  "expected an active head-to-head mission to count as a valid turn mode even without contract or failure buttons",
);

assert.match(
  source,
  /function syncHeadToHeadMissionMode\(\) \{[\s\S]*assistRecipients\[player\.id\] = 0;[\s\S]*assistPrestigeRecipients\[player\.id\] = 0;[\s\S]*setStayAtBaseSelected\(false\);[\s\S]*setContractChoice\(0\);[\s\S]*setFailureChoice\(0\);[\s\S]*setHiddenAssistPlayers\(nextHidden\);[\s\S]*prestige: 0,[\s\S]*contracts: 0,[\s\S]*failures: 0,[\s\S]*headToHeadFirstPlaceId: current\.headToHeadFirstPlaceId \?\? null,[\s\S]*headToHeadSecondPlaceId: current\.headToHeadSecondPlaceId \?\? null,[\s\S]*\}/s,
  "expected head-to-head mode activation to clear assists and reset the direct-prestige fields into mission mode",
);

assert.match(
  source,
  /useEffect\(\(\) => \{[\s\S]*if \(!headToHeadMissionActive\) return;[\s\S]*syncHeadToHeadMissionMode\(\);[\s\S]*\}, \[\s*headToHeadMissionActive,\s*current\.headToHeadFirstPlaceId,\s*current\.headToHeadSecondPlaceId,\s*\]\);/s,
  "expected the game screen to re-apply mission mode whenever the active head-to-head selection changes so assists reset back to none",
);

assert.match(
  source,
  /headToHeadMissionActive \? \([\s\S]*styles\.headToHeadActiveBox[\s\S]*styles\.headToHeadActiveBody[\s\S]*styles\.headToHeadActiveSummaryWrap/s,
  "expected an active head-to-head mission to replace the normal direct prestige controls with a dedicated full-box layout",
);

assert.match(
  source,
  /headToHeadActiveBody:\s*\{[\s\S]*minHeight:\s*112,[\s\S]*alignItems:\s*'center',[\s\S]*justifyContent:\s*'center',/s,
  "expected the active head-to-head mission title area to center itself within the full direct-prestige box",
);

assert.match(
  source,
  /styles\.sectionCard,[\s\S]*borderColor:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.5\)\s*:\s*withAlpha\(currentAccent,\s*0\.36\),[\s\S]*backgroundColor:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.12\)\s*:\s*mixWithBlack\(currentAccent,\s*0\.84\),[\s\S]*glowStyle\(withAlpha\(headToHeadMissionActive\s*\?\s*UI\.silver\s*:\s*currentAccent,\s*0\.95\),\s*0\.16,\s*8,\s*6\)/s,
  "expected the outer Direct Prestige shell to switch to the silver glow treatment when head-to-head mode is active",
);

assert.match(
  source,
  /styles\.directPrestigeFrame,[\s\S]*backgroundColor:\s*stayAtBaseSelected\s*\?\s*withAlpha\(UI\.gold,\s*0\.05\)\s*:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.12\)\s*:\s*withAlpha\(currentAccent,\s*0\.09\),[\s\S]*borderColor:\s*stayAtBaseSelected\s*\?\s*withAlpha\(UI\.gold,\s*0\.44\)\s*:\s*headToHeadMissionActive\s*\?\s*withAlpha\(UI\.silver,\s*0\.5\)\s*:\s*withAlpha\(currentAccent,\s*0\.38\),[\s\S]*stayAtBaseSelected\s*\?\s*glowStyle\(withAlpha\(UI\.gold,\s*0\.92\),\s*0\.12,\s*6,\s*4\)\s*:\s*headToHeadMissionActive\s*\?\s*glowStyle\(withAlpha\(UI\.silver,\s*0\.88\),\s*0\.16,\s*8,\s*5\)\s*:\s*glowStyle\(withAlpha\(currentAccent,\s*0\.95\),\s*0\.1,\s*6,\s*4\)/s,
  "expected the inner Direct Prestige frame to use the same silver glow treatment while head-to-head mode is selected",
);

assert.match(
  source,
  /<Text style=\{styles\.headToHeadActiveTitle\}>Head to Head<\/Text>/,
  "expected the active mission state to replace the old Direct Prestige label with a simple Head to Head label",
);

assert.match(
  source,
  /headToHeadActiveTitle:\s*\{[\s\S]*textAlign:\s*'center',/s,
  "expected the head-to-head mission title text to be centered horizontally",
);

assert.match(
  source,
  /headToHeadActiveSummaryWrap:\s*\{[\s\S]*position:\s*'absolute',[\s\S]*left:\s*0,[\s\S]*bottom:\s*0,/s,
  "expected the active mission placement summary to anchor in the bottom-left corner of the mission box",
);

assert.match(
  source,
  /<Text style=\{styles\.headToHeadActiveMeta\}>1st: \{summary\.firstPlaceName\} \/ 2nd: \{summary\.secondPlaceName\}<\/Text>/,
  "expected the active mission summary to read as '1st: Name / 2nd: Name' inside the mission box",
);

console.log("game-head-to-head-mode.test.cjs passed");
