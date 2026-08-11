const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "add-players.tsx"));

assert.match(
  screenSource,
  /const handleSignOut = async \(\) => \{/,
  "expected app/add-players.tsx to define a dedicated roster sign-out handler",
);

assert.match(
  screenSource,
  /await runSignOutFlow\(\{\s*setPasswordRecoveryPending,\s*clearAuthState,\s*router,\s*\}\)/,
  "expected roster sign-out to delegate to the shared sign-out flow",
);

// The sequence itself now lives in one place, so assert it there rather than
// letting each screen keep its own copy to drift.
const signOutFlowSource = read(path.join("lib", "auth", "signOutFlow.ts"));

assert.match(
  signOutFlowSource,
  /await supabase\.auth\.signOut\(\)[\s\S]*clearPendingAuthIntent\(\)[\s\S]*setPasswordRecoveryPending\(false\)[\s\S]*clearAuthState\(\)[\s\S]*router\.replace\(APP_ROUTES\.login\)/,
  "expected the shared sign-out flow to clear auth intent, auth state, and return to login",
);

assert.match(
  read(path.join("app", "index.tsx")),
  /await runSignOutFlow\(\{/,
  "expected the home screen to reuse the shared sign-out flow rather than duplicating it",
);

assert.match(
  screenSource,
  /title="Sign out"[\s\S]*onPress=\{handleSignOut\}/,
  "expected the roster hero to expose a Sign out action wired to the roster sign-out handler",
);

assert.match(
  screenSource,
  /title="Command"/,
  "expected the roster hero to keep the Command return action alongside sign out",
);

console.log("roster-sign-out-entry.test.cjs passed");
