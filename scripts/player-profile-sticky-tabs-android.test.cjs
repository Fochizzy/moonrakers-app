const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.match(
  source,
  /Platform/,
  "expected the player profile screen to read the current platform before configuring sticky profile tabs",
);

assert.match(
  source,
  /const profileStickyHeaderIndices = Platform\.OS === "android" \? undefined : \[3\];/,
  "expected the player profile screen to keep the native sticky header disabled on Android where the built-in sticky rail stops accepting tab presses after scroll",
);

assert.match(
  source,
  /const \[androidStickyProfileTabsVisible,\s*setAndroidStickyProfileTabsVisible\] = useState\(false\);/,
  "expected the player profile screen to track whether the Android sticky profile tab overlay should be visible",
);

assert.match(
  source,
  /const showAndroidStickyProfileTabs = Platform\.OS === "android" && androidStickyProfileTabsVisible;/,
  "expected the player profile screen to derive a dedicated Android sticky-tab overlay visibility flag",
);

assert.match(
  source,
  /const handleProfileScroll = \(\s*event: NativeSyntheticEvent<NativeScrollEvent>\s*\) => \{[\s\S]*setAndroidStickyProfileTabsVisible/,
  "expected the player profile screen to drive the Android sticky-tab overlay from scroll position",
);

assert.match(
  source,
  /onScroll=\{handleProfileScroll\}/,
  "expected the player profile scroll view to report scroll updates to the Android sticky-tab overlay controller",
);

assert.match(
  source,
  /scrollEventThrottle=\{16\}/,
  "expected the player profile scroll view to stream scroll updates frequently enough for the Android sticky-tab overlay",
);

assert.match(
  source,
  /showAndroidStickyProfileTabs \? \([\s\S]*<View pointerEvents="box-none" style=\{styles\.androidStickyProfileTabsOverlay\}>[\s\S]*<ProfileTabRailShell[\s\S]*style=\{styles\.androidStickyProfileTabsOverlayShell\}/,
  "expected the player profile screen to render a custom Android sticky profile tab overlay instead of dropping sticky behavior entirely",
);

assert.doesNotMatch(
  source,
  /stickyHeaderIndices=\{\[3\]\}/,
  "expected the player profile screen to avoid an unconditional native sticky profile tab header",
);

console.log("player-profile-sticky-tabs-android.test.cjs passed");
