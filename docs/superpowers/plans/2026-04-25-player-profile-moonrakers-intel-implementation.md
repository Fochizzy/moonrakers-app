# Player Profile Moonrakers Intel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Moonrakers-specific intelligence block to the player profile page with playstyle, condition, base, objective, and support reads that reuse the new stay-at-base analytics pipeline.

**Architecture:** Keep `app/player-profile/[playerId].tsx` as the page assembly layer, add one pure data builder in `utils/playerProfileMoonrakers.ts`, and render the new Moonrakers cards through one focused profile component so the existing ELO tab system stays intact. Reuse `buildPlaystyleSamples()` for per-player game rows, extend it only where the profile needs missing prestige split fields, and drive confidence through a Node-based regression script before touching the screen copy.

**Tech Stack:** Expo Router, React Native, Zustand store data, TypeScript utilities, Node CommonJS regression scripts with `typescript` transpile-on-load.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\playerProfileMoonrakers.ts`
  - Pure profile rollups for playstyle, best/worst condition, base discipline, objective profile, and support profile.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player\MoonrakersIntelSection.tsx`
  - Dense profile-card renderer for the new Moonrakers block plus the insufficient-data state.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`
  - Data-level regression tests and a source smoke check for the profile labels/wiring.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\playstyleEngine.ts`
  - Add the prestige split fields the profile needs while keeping the current stats page contract stable.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`
  - Build the Moonrakers intel model and render the new section between the existing ELO block and recent games.

### Task 1: Lock The New Behavior With A Failing Regression Script

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\utils\playerProfileMoonrakers.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\components\player\MoonrakersIntelSection.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`

- [ ] **Step 1: Write the failing regression script**

```js
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

const { buildMoonrakersIntelProfile } = require("../utils/playerProfileMoonrakers.ts");
const { buildPlaystyleSamples } = require("../utils/playstyleEngine.ts");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const players = [
  { id: "a", name: "Astra", color: "#A855F7" },
  { id: "b", name: "Bolt", color: "#22C55E" },
  { id: "c", name: "Comet", color: "#60A5FA" },
  { id: "d", name: "Drift", color: "#FBBF24" },
];

const games = [
  {
    id: "g-1",
    winnerId: "a",
    players: [
      { id: "a", startOrder: 0 },
      { id: "b", startOrder: 1 },
      { id: "c", startOrder: 2 },
      { id: "d", startOrder: 3 },
    ],
    totals: {
      a: {
        totalPrestige: 13,
        directPrestige: 7,
        assistPrestigeReceived: 3,
        objectiveCount: 3,
        assists: 2,
        failures: 0,
        contracts: 2,
        assistPrestigeBySource: { b: 2, c: 1 },
      },
      b: {
        totalPrestige: 10,
        directPrestige: 6,
        assistPrestigeReceived: 1,
        objectiveCount: 3,
        assists: 1,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: { a: 1 },
      },
      c: {
        totalPrestige: 8,
        directPrestige: 5,
        assistPrestigeReceived: 1,
        objectiveCount: 2,
        assists: 1,
        failures: 1,
        contracts: 1,
        assistPrestigeBySource: { a: 1 },
      },
      d: {
        totalPrestige: 6,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 2,
        contracts: 1,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 1, failures: 0, assistRecipients: { b: 1, c: 1 } },
      { playerId: "a", contracts: 0, failures: 0, assistRecipients: {} },
      { playerId: "a", contracts: 0, failures: 0, objectiveCount: 3, metaType: "bonusObjective" },
    ],
  },
  {
    id: "g-2",
    winnerId: "a",
    players: [
      { id: "a", startOrder: 0 },
      { id: "b", startOrder: 1 },
      { id: "c", startOrder: 2 },
    ],
    totals: {
      a: {
        totalPrestige: 11,
        directPrestige: 9,
        assistPrestigeReceived: 1,
        objectiveCount: 1,
        assists: 1,
        failures: 0,
        contracts: 3,
        assistPrestigeBySource: { b: 1 },
      },
      b: {
        totalPrestige: 9,
        directPrestige: 6,
        assistPrestigeReceived: 2,
        objectiveCount: 1,
        assists: 2,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: { a: 1, c: 1 },
      },
      c: {
        totalPrestige: 7,
        directPrestige: 6,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 2, failures: 0, assistRecipients: { b: 1 } },
      { playerId: "a", contracts: 1, failures: 0, assistRecipients: {} },
      { playerId: "a", contracts: 0, failures: 0, objectiveCount: 1, metaType: "bonusObjective" },
    ],
  },
  {
    id: "g-3",
    winnerId: "b",
    players: [
      { id: "a", startOrder: 1 },
      { id: "b", startOrder: 0 },
      { id: "c", startOrder: 2 },
    ],
    totals: {
      a: {
        totalPrestige: 7,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        objectiveCount: 2,
        assists: 0,
        failures: 1,
        contracts: 1,
        assistPrestigeBySource: {},
      },
      b: {
        totalPrestige: 12,
        directPrestige: 8,
        assistPrestigeReceived: 2,
        objectiveCount: 2,
        assists: 2,
        failures: 0,
        contracts: 2,
        assistPrestigeBySource: { a: 1, c: 1 },
      },
      c: {
        totalPrestige: 6,
        directPrestige: 4,
        assistPrestigeReceived: 1,
        objectiveCount: 1,
        assists: 1,
        failures: 1,
        contracts: 1,
        assistPrestigeBySource: { a: 1 },
      },
    },
    rounds: [
      { playerId: "a", contracts: 1, failures: 1, assistRecipients: {} },
      { playerId: "a", contracts: 0, failures: 0, objectiveCount: 2, metaType: "bonusObjective" },
    ],
  },
  {
    id: "g-4",
    winnerId: "c",
    players: [
      { id: "a", startOrder: 2 },
      { id: "b", startOrder: 0 },
      { id: "c", startOrder: 1 },
      { id: "d", startOrder: 3 },
    ],
    totals: {
      a: {
        totalPrestige: 5,
        directPrestige: 4,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 2,
        contracts: 1,
        assistPrestigeBySource: {},
      },
      b: { totalPrestige: 8, directPrestige: 5, assistPrestigeReceived: 1, objectiveCount: 2, assists: 1, failures: 1, contracts: 2, assistPrestigeBySource: { a: 1 } },
      c: { totalPrestige: 10, directPrestige: 7, assistPrestigeReceived: 1, objectiveCount: 2, assists: 1, failures: 0, contracts: 2, assistPrestigeBySource: { b: 1 } },
      d: { totalPrestige: 7, directPrestige: 5, assistPrestigeReceived: 0, objectiveCount: 2, assists: 0, failures: 1, contracts: 2, assistPrestigeBySource: {} },
    },
    rounds: [
      { playerId: "a", contracts: 0, failures: 0, assistRecipients: {} },
      { playerId: "a", contracts: 1, failures: 2, assistRecipients: {} },
      { playerId: "a", contracts: 0, failures: 0, objectiveCount: 1, metaType: "bonusObjective" },
    ],
  },
];

const samples = buildPlaystyleSamples(players, games);
const profile = buildMoonrakersIntelProfile({
  playerId: "a",
  players,
  games,
  samples,
});

assert.equal(samples[0].directPrestige, 7);
assert.equal(samples[0].assistPrestigeReceived, 3);
assert.equal(profile.hasData, true);
assert.equal(profile.playstyle.styleRead, "Objective");
assert.equal(profile.bestCondition?.label, "Best in 4p");
assert.equal(profile.worstCondition?.label, "Worst from Late Seat");
assert.equal(profile.baseDiscipline.baseRateLabel, "25%");
assert.equal(profile.objectiveProfile.highObjectiveGamesLabel, "2/4");
assert.equal(profile.supportProfile.bestSupportPartner?.playerName, "Bolt");
assert.equal(profile.supportProfile.mostCommonAssistTarget?.playerName, "Bolt");

const thinProfile = buildMoonrakersIntelProfile({
  playerId: "d",
  players,
  games: games.slice(0, 2),
  samples: buildPlaystyleSamples(players, games.slice(0, 2)),
});

assert.equal(thinProfile.hasData, false);
assert.match(thinProfile.emptyTitle, /Not enough Moonrakers data yet/i);

const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));
assert.match(profileSource, /Moonrakers Intel/);
assert.match(profileSource, /MoonrakersIntelSection/);

const sectionSource = read(path.join("components", "player", "MoonrakersIntelSection.tsx"));
assert.match(sectionSource, /Playstyle/);
assert.match(sectionSource, /Best Condition/);
assert.match(sectionSource, /Worst Condition/);
assert.match(sectionSource, /Base Discipline/);
assert.match(sectionSource, /Objective Profile/);
assert.match(sectionSource, /Support Profile/);

console.log("player-profile-moonrakers.test.cjs passed");
```

- [ ] **Step 2: Run the regression script to verify the failure mode**

Run: `node .\scripts\player-profile-moonrakers.test.cjs`

Expected: `FAIL` because `../utils/playerProfileMoonrakers.ts` does not exist yet and the profile source does not render `MoonrakersIntelSection`.

### Task 2: Build The Pure Moonrakers Intel Data Model

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\playstyleEngine.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\playerProfileMoonrakers.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`

- [ ] **Step 1: Extend `PlaystyleSample` with the missing prestige split fields**

```ts
export type PlaystyleSample = {
  gameId: string;
  playerId: string;
  playerName: string;
  tableSize: number;
  seat: number | null;
  winFlag: 0 | 1;
  totalPrestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  objectivePoints: number;
  assistsGiven: number;
  assistsReceived: number;
  stayAtBaseTurns: number;
  playableTurns: number;
  stayAtBaseRate: number | null;
};

return {
  gameId: String(game?.id ?? ""),
  playerId,
  playerName: player?.name ?? (gamePlayer as any)?.name ?? "Player",
  tableSize,
  seat: getRecordedSeat(gamePlayer),
  winFlag: winnerId === playerId ? 1 : 0,
  totalPrestige: normalizedTotals.totalPrestige,
  directPrestige: normalizedTotals.directPrestige,
  assistPrestigeReceived: normalizedTotals.assistPrestigeReceived,
  objectivePoints: getObjectivePointsForPlayer(playerId, rounds, normalizedTotals),
  assistsGiven: getAssistsGivenForPlayer(playerId, rounds),
  assistsReceived: getAssistsReceivedForPlayer(playerId, rounds),
  stayAtBaseTurns,
  playableTurns,
  stayAtBaseRate: playableTurns > 0 ? stayAtBaseTurns / playableTurns : null,
};
```

- [ ] **Step 2: Add the pure profile rollup helper**

```ts
export function buildMoonrakersIntelProfile({
  playerId,
  players,
  games,
  samples,
}: BuildMoonrakersIntelProfileInput): MoonrakersIntelProfile {
  const playerSamples = samples.filter((sample) => sample.playerId === playerId);

  if (playerSamples.length < 3) {
    return {
      hasData: false,
      emptyTitle: "Not enough Moonrakers data yet",
      emptyBody: "Finish or import a few more games to unlock player-specific playstyle reads.",
    };
  }

  return {
    hasData: true,
    playstyle: buildPlaystyleSection(playerSamples),
    bestCondition: pickCondition(playerSamples, "best"),
    worstCondition: pickCondition(playerSamples, "worst"),
    baseDiscipline: buildBaseDiscipline(playerSamples),
    objectiveProfile: buildObjectiveProfile(playerSamples),
    supportProfile: buildSupportProfile({ playerId, players, games, samples: playerSamples }),
  };
}
```

Key helper responsibilities in this file:

```ts
function buildPlaystyleSection(samples: PlaystyleSample[]) {
  const directPerGame = average(samples.map((sample) => sample.directPrestige));
  const assistPerGame = average(samples.map((sample) => sample.assistPrestigeReceived));
  const objectivePerGame = average(samples.map((sample) => sample.objectivePoints));
  const baseTurnsPerGame = average(samples.map((sample) => sample.stayAtBaseTurns));
  const baseRate = average(samples.map((sample) => sample.stayAtBaseRate).filter(isFiniteNumber));

  return {
    directPrestigePerGameLabel: formatNumber(directPerGame),
    assistPrestigeReceivedPerGameLabel: formatNumber(assistPerGame),
    objectivePointsPerGameLabel: formatNumber(objectivePerGame),
    baseTurnsPerGameLabel: formatNumber(baseTurnsPerGame),
    baseRateLabel: formatPercent(baseRate),
    styleRead: getStyleRead({ directPerGame, assistPerGame, objectivePerGame }),
  };
}

function pickCondition(samples: PlaystyleSample[], mode: "best" | "worst") {
  const candidates = [
    buildTableSizeCandidates(samples),
    buildSeatBandCandidates(samples),
    buildBinaryCandidates(samples, "base"),
    buildBinaryCandidates(samples, "objectives"),
  ].flat().filter((candidate) => candidate.sampleSize >= 3);

  if (!candidates.length) return null;

  return [...candidates].sort((left, right) => compareConditions(left, right, mode))[0];
}

function buildSupportProfile(input: SupportProfileInput) {
  return {
    assistsGivenPerGameLabel: formatNumber(average(input.samples.map((sample) => sample.assistsGiven))),
    assistsReceivedPerGameLabel: formatNumber(average(input.samples.map((sample) => sample.assistsReceived))),
    bestSupportPartner: pickBestSupportPartner(input),
    mostCommonAssistTarget: pickMostCommonAssistTarget(input),
    supportStyle: getSupportStyle(input.samples),
  };
}
```

- [ ] **Step 3: Run the regression script again**

Run: `node .\scripts\player-profile-moonrakers.test.cjs`

Expected: data assertions pass, but the smoke assertions still fail because the new profile component and screen wiring are not in place yet.

### Task 3: Render Moonrakers Intel Inside The Player Profile

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player\MoonrakersIntelSection.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`

- [ ] **Step 1: Add the focused render component**

```tsx
export default function MoonrakersIntelSection({
  profile,
}: {
  profile: MoonrakersIntelProfile;
}) {
  if (!profile.hasData) {
    return (
      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Moonrakers Intel</Text>
          <Text style={styles.sectionSub}>Playstyle and condition reads</Text>
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{profile.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{profile.emptyBody}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionCompact}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Moonrakers Intel</Text>
        <Text style={styles.sectionSub}>Playstyle and condition reads</Text>
      </View>
      <IntelSubsection title="Playstyle" cards={buildPlaystyleCards(profile.playstyle)} />
      <IntelSubsection title="Best Condition" cards={buildConditionCards(profile.bestCondition)} />
      <IntelSubsection title="Worst Condition" cards={buildConditionCards(profile.worstCondition)} />
      <IntelSubsection title="Base Discipline" cards={buildBaseCards(profile.baseDiscipline)} />
      <IntelSubsection title="Objective Profile" cards={buildObjectiveCards(profile.objectiveProfile)} />
      <IntelSubsection title="Support Profile" cards={buildSupportCards(profile.supportProfile)} />
    </View>
  );
}
```

- [ ] **Step 2: Wire the new section into the profile screen**

```tsx
import MoonrakersIntelSection from "@/components/player/MoonrakersIntelSection";
import { buildMoonrakersIntelProfile } from "@/utils/playerProfileMoonrakers";
import { buildPlaystyleSamples } from "@/utils/playstyleEngine";

const playstyleSamples = useMemo(
  () => buildPlaystyleSamples(players, games),
  [players, games]
);

const moonrakersIntel = useMemo(
  () =>
    playerId
      ? buildMoonrakersIntelProfile({
          playerId: String(playerId),
          players: sortedPlayers,
          games,
          samples: playstyleSamples,
        })
      : {
          hasData: false,
          emptyTitle: "Not enough Moonrakers data yet",
          emptyBody:
            "Finish or import a few more games to unlock player-specific playstyle reads.",
        },
  [games, playstyleSamples, playerId, sortedPlayers]
);

<View style={styles.sectionCompact}>
  <Text style={styles.sectionTitle}>Recent Games</Text>
</View>
```

Insert the new render immediately before the existing `Recent Games` section:

```tsx
<MoonrakersIntelSection profile={moonrakersIntel} />
```

- [ ] **Step 3: Run the targeted regression script and confirm it is green**

Run: `node .\scripts\player-profile-moonrakers.test.cjs`

Expected: `player-profile-moonrakers.test.cjs passed`

- [ ] **Step 4: Run a focused type check on the touched files**

Run: `npx.cmd tsc --noEmit --pretty false app/player-profile/[playerId].tsx components/player/MoonrakersIntelSection.tsx utils/playerProfileMoonrakers.ts utils/playstyleEngine.ts`

Expected: if `tsc` ignores file-scoped entry arguments in this repo, capture the real output and fall back to reporting the unchanged repo-wide pre-existing failures instead of claiming a clean typecheck.

## Self-Review

### Spec coverage

- `Playstyle`: Task 2 builds the playstyle rollup, Task 3 renders it.
- `Best Condition` and `Worst Condition`: Task 2 candidate ranking plus Task 3 render.
- `Base Discipline`: Task 2 split builder plus Task 3 render.
- `Objective Profile`: Task 2 split builder plus Task 3 render.
- `Support Profile`: Task 2 partner/target rollups plus Task 3 render.
- insufficient-data guard: Task 2 returns the empty state and Task 3 renders it.
- screen placement: Task 3 wires the section between the rating block and recent games.

### Placeholder scan

- No `TODO`, `TBD`, or “handle appropriately” placeholders remain.
- Every code-touching step names the exact file path and includes the intended code shape.
- Every verification step names the command and expected outcome.

### Type consistency

- The plan uses `buildMoonrakersIntelProfile` consistently as the new pure helper.
- `MoonrakersIntelSection` is the only new render component name used across tasks.
- `PlaystyleSample` is the shared per-player-per-game model across the helper and the screen.
