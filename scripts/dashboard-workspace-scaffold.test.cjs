const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relPath), "utf8"));
}

function readText(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const rootPackage = readJson("package.json");

assert.deepEqual(
  rootPackage.workspaces,
  ["apps/*", "packages/*"],
  "expected root package.json to declare app and package workspaces",
);

for (const scriptName of [
  "dashboard:dev",
  "dashboard:build",
  "dashboard:typecheck",
  "dashboard:test",
  "dashboard:e2e",
]) {
  assert.ok(
    rootPackage.scripts?.[scriptName],
    `expected root package.json to expose ${scriptName}`,
  );
}

const envExample = readText(".env.example");
assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL=/);
assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);

const dashboardPackage = readJson(path.join("apps", "dashboard", "package.json"));
assert.equal(
  dashboardPackage.name,
  "@moonrakers/dashboard",
  "expected the dashboard workspace name to be @moonrakers/dashboard",
);

const nextConfig = readText(path.join("apps", "dashboard", "next.config.ts"));
assert.match(
  nextConfig,
  /transpilePackages:\s*\["@moonrakers\/analytics-contract"\]/,
  "expected the dashboard app to transpile the shared analytics workspace package",
);

assert.equal(
  fs.existsSync(path.join(projectRoot, "apps", "dashboard", "vitest.config.ts")),
  true,
  "expected the dashboard workspace to include a Vitest config",
);
assert.equal(
  fs.existsSync(path.join(projectRoot, "apps", "dashboard", "open-next.config.ts")),
  true,
  "expected the dashboard workspace to include an OpenNext config",
);
assert.equal(
  fs.existsSync(path.join(projectRoot, "apps", "dashboard", "wrangler.jsonc")),
  true,
  "expected the dashboard workspace to include a wrangler config",
);
assert.equal(
  fs.existsSync(path.join(projectRoot, "apps", "dashboard", "cloudflare-env.d.ts")),
  true,
  "expected the dashboard workspace to generate cloudflare-env.d.ts",
);
assert.equal(
  fs.existsSync(path.join(projectRoot, "apps", "dashboard", "src", "test", "setup.ts")),
  true,
  "expected the dashboard workspace to include test setup",
);

const layoutText = readText(path.join("apps", "dashboard", "src", "app", "layout.tsx"));
assert.match(layoutText, /Moonrakers Dashboard/);

const globalsCss = readText(path.join("apps", "dashboard", "src", "app", "globals.css"));
assert.match(
  globalsCss,
  /--accent:\s*#A855F7/i,
  "expected globals.css to keep the app primary accent color",
);
assert.match(
  globalsCss,
  /--blue:\s*#3B82F6/i,
  "expected globals.css to keep the app comparison accent color",
);
assert.match(
  globalsCss,
  /--green:\s*#22C55E/i,
  "expected globals.css to keep the app success accent color",
);
assert.match(
  globalsCss,
  /radial-gradient/i,
  "expected globals.css to use layered atmospheric backgrounds instead of a flat fill",
);

console.log("dashboard-workspace-scaffold.test.cjs passed");
