const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game-setup.tsx"),
  "utf8",
);

assert.match(
  source,
  /<DraggableFlatList[\s\S]*?containerStyle=\{styles\.list\}/,
  "expected the turn-order DraggableFlatList outer container to own the remaining height so player rows stay visible and scrollable",
);

assert.doesNotMatch(
  source,
  /<DraggableFlatList[\s\S]*?style=\{styles\.list\}/,
  "expected the turn-order flex sizing to avoid the inner FlatList style prop, which can collapse the draggable list body",
);

assert.match(
  source,
  /const insets = useSafeAreaInsets\(\);/,
  "expected the game setup screen to read safe-area insets so Android bottom navigation can be respected",
);

assert.match(
  source,
  /const turnOrderListBottomInset = Math\.max\(insets\.bottom, 14\) \+ 8;/,
  "expected the turn-order list to compute bottom breathing room from the safe-area inset",
);

assert.match(
  source,
  /contentContainerStyle=\{[\s\S]*?styles\.listContent[\s\S]*?paddingBottom:\s*turnOrderListBottomInset,[\s\S]*?\}/,
  "expected the turn-order list content to pad its bottom so the last player clears Android system navigation",
);

assert.match(
  source,
  /list:\s*\{\s*flex:\s*1,?\s*\}/,
  "expected the turn-order list style to keep a flex: 1 scroll region under the setup header",
);

assert.match(
  source,
  /useState<PlayerLike\[\]>\(\(\) =>\s*withResolvedColors\(resolvedPlayers\)\s*\)/,
  "expected turn order state to seed from the resolved players so the draggable list never mounts with empty data and loses its scroll measurement",
);

assert.match(
  source,
  /<DraggableFlatList[\s\S]*?key=\{turnOrderListMountKey\}/,
  "expected the turn-order list to remount when roster membership changes so a late-hydrating draft still mounts a list that can scroll",
);

assert.match(
  source,
  /const turnOrderListMountKey = useMemo\(\s*\(\) => buildRosterMountKey\(turnOrder\),/,
  "expected the list mount key to derive from roster membership only, so reordering or recoloring never remounts the list mid-session",
);

console.log("game-setup-turn-order-scroll.test.cjs passed");
