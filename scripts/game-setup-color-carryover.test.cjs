const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

const {
  applyTurnOrderPlayerColorOverride,
  buildGameSetupDraftFromTurnOrder,
} = require("../utils/gameSetupTurnOrder.ts");
const {
  buildActiveGameProjection,
} = require("../lib/game-draft/buildActiveGameProjection.ts");
const { normalizeGameDraftRow } = require("../lib/cloud/game-drafts/normalizeGameDraftRow.ts");
const { resolveStoredPlayerColor } = require("../utils/playerColor.ts");

const EMPTY_GAMEPLAY = {
  turnIndex: 0,
  rounds: [],
  totals: {},
  current: {
    prestige: 0,
    contracts: 0,
    failures: 0,
    assistRecipients: {},
    assistPrestigeRecipients: {},
    objectiveCount: 0,
    headToHeadFirstPlaceId: null,
    headToHeadSecondPlaceId: null,
  },
  roundCount: 0,
  selectedWinnerId: null,
};

const setupPlayers = [
  { id: "corey", name: "Corey", initials: "CO", color: "blue", assignedCardArtIndex: 10 },
  { id: "greg", name: "Greg", initials: "GR", color: "green", assignedCardArtIndex: 11 },
];

const setupDraft = {
  profileId: "host-1",
  draftId: "11111111-1111-4111-8111-111111111111",
  phase: "setup",
  revision: 1,
  updatedAt: 10,
  deviceUpdatedAt: 10,
  selectedPlayerIds: ["corey", "greg"],
  selectedGroupId: null,
  selectedGroupName: null,
  turnOrder: ["corey", "greg"],
  playerSnapshots: setupPlayers,
  gameplay: null,
};

// Setup screen: pick a game-only colour for Corey.
const syncedDraft = buildGameSetupDraftFromTurnOrder({
  draft: setupDraft,
  players: applyTurnOrderPlayerColorOverride(setupPlayers, "corey", "yellow"),
  now: 42,
});

// Start Game: beginGameplay only flips the phase and seeds gameplay.
const gameplayDraft = {
  ...syncedDraft,
  phase: "in_progress",
  gameplay: EMPTY_GAMEPLAY,
};

const activeGame = buildActiveGameProjection(gameplayDraft);
const coreyInGame = activeGame.players.find((player) => player.id === "corey");

assert.equal(
  coreyInGame?.color,
  "yellow",
  "expected the game-only setup colour to survive projection onto the game screen",
);

assert.equal(
  coreyInGame?.assignedCardArtIndex,
  14,
  "expected the game-only setup colour's card art to survive projection onto the game screen",
);

// app/game.tsx re-normalizes each projected colour before theming.
const gameScreenPlayers = activeGame.players.map((player, index) => ({
  ...player,
  color: resolveStoredPlayerColor(player.color, index),
}));

assert.equal(
  gameScreenPlayers.find((player) => player.id === "corey")?.color,
  "yellow",
  "expected the game screen colour normalization to keep the game-only colour rather than falling back to the index default",
);

assert.equal(
  gameScreenPlayers.find((player) => player.id === "greg")?.color,
  "green",
  "expected unrelated players to keep their own colour on the game screen",
);

// The debounced remote save round-trips the draft through Supabase, so the
// normalized row must not drop the colour and reset the game screen a beat later.
const roundTripped = normalizeGameDraftRow({
  profile_id: gameplayDraft.profileId,
  draft_id: gameplayDraft.draftId,
  phase: gameplayDraft.phase,
  revision: gameplayDraft.revision,
  updated_at: new Date(gameplayDraft.updatedAt).toISOString(),
  device_updated_at: new Date(gameplayDraft.deviceUpdatedAt).toISOString(),
  payload: {
    selectedPlayerIds: gameplayDraft.selectedPlayerIds,
    selectedGroupId: gameplayDraft.selectedGroupId,
    selectedGroupName: gameplayDraft.selectedGroupName,
    turnOrder: gameplayDraft.turnOrder,
    playerSnapshots: gameplayDraft.playerSnapshots,
    gameplay: gameplayDraft.gameplay,
  },
});

assert.equal(
  roundTripped?.playerSnapshots?.find((player) => player.id === "corey")?.color,
  "yellow",
  "expected the Supabase draft round-trip to preserve the game-only colour",
);

assert.equal(
  buildActiveGameProjection(roundTripped).players.find((player) => player.id === "corey")?.color,
  "yellow",
  "expected the game screen to keep the game-only colour after the draft round-trips through Supabase",
);

console.log("game-setup-color-carryover.test.cjs passed");
