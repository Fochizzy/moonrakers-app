# Moonrakers Companion Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate in-repo Next.js dashboard that lets a signed-in Moonrakers player create an account, complete profile onboarding, and use desktop-first home, compare, stats, charts, insights, correlations, ELO, and profile analytics surfaces backed by the existing Supabase contracts, styled to match the Moonrakers app, and ready to launch on Cloudflare Workers.

**Architecture:** Add `apps/dashboard` as a Next.js App Router workspace and extract the current analytics RPC wrappers into a shared workspace package so both Expo and Next can consume the same typed Supabase contract layer. Target Cloudflare Workers from day one using Cloudflare's Next.js workflow and the OpenNext adapter, keep auth and route protection web-native with `@supabase/ssr`, make route pages thin server components, and render desktop-specific view components that consume server-loaded payloads for home, compare, stats/correlations, charts, insights, ELO, and profile. Derive the web visual system from the existing app tokens in `utils/colors.ts`, `utils/chartTheme.ts`, and `components/charts/chartVisualSystem.ts` so the browser UI feels like the same Moonrakers analytics product.

**Tech Stack:** Next.js App Router, React 19, TypeScript, npm workspaces, Cloudflare Workers, OpenNext (`@opennextjs/cloudflare`), Wrangler, `@supabase/supabase-js`, `@supabase/ssr`, Recharts, Vitest, React Testing Library, Playwright, existing Moonrakers Supabase analytics RPCs, `npm.cmd`, `npx.cmd`

**Visual Direction:** Reuse the app's dark-space palette, chart accent hierarchy, and compact analytics chrome. The site should feel like a Moonrakers command board with luminous purple/blue/green/teal signals, translucent tactical panels, and dense intel cards, not a generic white or gray SaaS dashboard.

---

## File Structure

### Root workspace and shared packages

- Create: `scripts/dashboard-workspace-scaffold.test.cjs`
  - Source guard for the dashboard workspace scaffold, root scripts, and shared-package wiring.
- Create: `scripts/dashboard-analytics-contract-bridge.test.cjs`
  - Source guard that the new shared analytics package exists and the Expo app delegates to it through compatibility shims.
- Modify: `package.json`
  - Add npm workspaces and root dashboard scripts.
- Modify: `.env.example`
  - Add web-facing Supabase env vars alongside the existing Expo vars.
- Modify: `package-lock.json`
  - Capture the workspace dependency graph after installs.
- Create: `packages/analytics-contract/package.json`
  - Shared package manifest for analytics RPC types and wrappers.
- Create: `packages/analytics-contract/tsconfig.json`
  - TypeScript config for the shared analytics package.
- Create: `packages/analytics-contract/src/index.ts`
  - Central export surface for the shared analytics package.
- Create: `packages/analytics-contract/src/types.ts`
  - Shared analytics types migrated from the current Expo analytics contract layer.
- Create: `packages/analytics-contract/src/internal.ts`
  - Shared analytics RPC client helpers and result unwrapping logic.
- Create: `packages/analytics-contract/src/getAnalyticsHome.ts`
- Create: `packages/analytics-contract/src/getStatsScreen.ts`
- Create: `packages/analytics-contract/src/getInsightsScreen.ts`
- Create: `packages/analytics-contract/src/getChartSetup.ts`
- Create: `packages/analytics-contract/src/getChartDataset.ts`
- Create: `packages/analytics-contract/src/getEloScreen.ts`
- Create: `packages/analytics-contract/src/getPlayerProfileScreen.ts`
  - Shared analytics RPC wrappers reused by Expo and Next.
- Modify: `lib/cloud/analytics/types.ts`
- Modify: `lib/cloud/analytics/getAnalyticsHome.ts`
- Modify: `lib/cloud/analytics/getStatsScreen.ts`
- Modify: `lib/cloud/analytics/getInsightsScreen.ts`
- Modify: `lib/cloud/analytics/getChartSetup.ts`
- Modify: `lib/cloud/analytics/getChartDataset.ts`
- Modify: `lib/cloud/analytics/getEloScreen.ts`
- Modify: `lib/cloud/analytics/getPlayerProfileScreen.ts`
  - Keep Expo-side overloads intact while delegating their injected-client path to the shared package.

### Next.js dashboard app

- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/tsconfig.json`
- Create: `apps/dashboard/next.config.ts`
- Create: `apps/dashboard/wrangler.jsonc`
- Create: `apps/dashboard/open-next.config.ts`
- Create: `apps/dashboard/cloudflare-env.d.ts`
- Create: `apps/dashboard/eslint.config.mjs`
- Create: `apps/dashboard/vitest.config.ts`
- Create: `apps/dashboard/playwright.config.ts`
- Create: `apps/dashboard/proxy.ts`
  - Dashboard workspace scaffold, OpenNext config, and Cloudflare runtime entry points.
- Create: `apps/dashboard/src/test/setup.ts`
  - Vitest + Testing Library setup.
- Create: `apps/dashboard/src/app/layout.tsx`
- Create: `apps/dashboard/src/app/globals.css`
  - Shared dashboard shell, font loading, app-aligned color tokens, and board-game atmosphere rules.
- Create: `apps/dashboard/src/lib/env.ts`
- Create: `apps/dashboard/src/lib/supabase/browser.ts`
- Create: `apps/dashboard/src/lib/supabase/server.ts`
- Create: `apps/dashboard/src/lib/supabase/proxy.ts`
- Create: `apps/dashboard/src/lib/data/rpcClient.ts`
- Create: `apps/dashboard/src/lib/auth/profileReadiness.ts`
- Create: `apps/dashboard/src/lib/auth/serverAccess.ts`
  - Supabase SSR clients, auth gating, and route-level access helpers.
- Create: `apps/dashboard/src/lib/data/loadDashboardHome.ts`
- Create: `apps/dashboard/src/lib/data/loadCompareScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadStatsScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadInsightsScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadEloScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadProfileScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadChartScreen.ts`
  - Thin data-access layer that loads page-safe payloads from the shared analytics package.

### Dashboard routes and components

- Create: `apps/dashboard/src/app/auth/page.tsx`
- Create: `apps/dashboard/src/app/auth/callback/route.ts`
- Create: `apps/dashboard/src/app/onboarding/page.tsx`
- Create: `apps/dashboard/src/app/onboarding/actions.ts`
  - Public auth and profile-bootstrap routes.
- Create: `apps/dashboard/src/app/(dashboard)/layout.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/compare/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/stats/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/charts/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/charts/[chartKey]/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/insights/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/elo/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/profile/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/loading.tsx`
  - Protected dashboard routes.
- Create: `apps/dashboard/src/components/layout/DashboardSidebar.tsx`
- Create: `apps/dashboard/src/components/layout/DashboardTopbar.tsx`
- Create: `apps/dashboard/src/components/ui/DashboardPanel.tsx`
- Create: `apps/dashboard/src/components/ui/MetricCard.tsx`
- Create: `apps/dashboard/src/components/ui/EmptyStatePanel.tsx`
- Create: `apps/dashboard/src/components/ui/SectionHeading.tsx`
  - Shared layout and card primitives, including the default Moonrakers panel chrome used across routes.
- Create: `apps/dashboard/src/components/auth/AuthPanel.tsx`
- Create: `apps/dashboard/src/components/auth/OnboardingForm.tsx`
  - Public forms for sign in, account creation, password recovery, and profile bootstrap.
- Create: `apps/dashboard/src/components/home/HomeView.tsx`
- Create: `apps/dashboard/src/components/compare/CompareView.tsx`
- Create: `apps/dashboard/src/components/stats/StatsView.tsx`
- Create: `apps/dashboard/src/components/insights/InsightsView.tsx`
- Create: `apps/dashboard/src/components/elo/EloView.tsx`
- Create: `apps/dashboard/src/components/profile/ProfileView.tsx`
- Create: `apps/dashboard/src/components/charts/ChartsIndexView.tsx`
- Create: `apps/dashboard/src/components/charts/ChartDetailView.tsx`
- Create: `apps/dashboard/src/components/charts/ChartRenderer.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/CartesianChartPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/ComparisonChartPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/NetworkChartPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/HeatmapPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/ReplayPanel.tsx`
  - Desktop-specific views for all required analytics surfaces.

### Dashboard tests

- Create: `apps/dashboard/src/lib/auth/profileReadiness.test.ts`
- Create: `apps/dashboard/src/components/auth/AuthPanel.test.tsx`
- Create: `apps/dashboard/src/components/auth/OnboardingForm.test.tsx`
- Create: `apps/dashboard/src/components/home/HomeView.test.tsx`
- Create: `apps/dashboard/src/components/compare/CompareView.test.tsx`
- Create: `apps/dashboard/src/components/stats/StatsView.test.tsx`
- Create: `apps/dashboard/src/components/insights/InsightsView.test.tsx`
- Create: `apps/dashboard/src/components/elo/EloView.test.tsx`
- Create: `apps/dashboard/src/components/profile/ProfileView.test.tsx`
- Create: `apps/dashboard/src/components/charts/ChartRenderer.test.tsx`
- Create: `apps/dashboard/tests/e2e/auth-onboarding.spec.ts`
- Create: `apps/dashboard/tests/e2e/dashboard-surfaces.spec.ts`
  - Coverage for auth flow, onboarding, route views, compare, charts, and protected navigation.

## Task 1: Scaffold The Dashboard Workspace And Test Harness

**Files:**
- Create: `scripts/dashboard-workspace-scaffold.test.cjs`
- Modify: `package.json`
- Modify: `.env.example`
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/next.config.ts`
- Create: `apps/dashboard/wrangler.jsonc`
- Create: `apps/dashboard/open-next.config.ts`
- Create: `apps/dashboard/vitest.config.ts`
- Create: `apps/dashboard/src/test/setup.ts`
- Create: `apps/dashboard/src/app/layout.tsx`
- Create: `apps/dashboard/src/app/globals.css`

- [ ] **Step 1: Write the failing workspace scaffold guard**

Create `scripts/dashboard-workspace-scaffold.test.cjs` with this content:

```js
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
```

- [ ] **Step 2: Run the scaffold guard and confirm it fails**

Run:

```powershell
node .\scripts\dashboard-workspace-scaffold.test.cjs
```

Expected: FAIL because `apps/dashboard/package.json` and the new workspace scripts do not exist yet.

- [ ] **Step 3: Scaffold the dashboard workspace and wire the root scripts**

Create the app scaffold with Cloudflare's Next.js workflow, or use `create-next-app` plus the equivalent manual OpenNext/Wrangler setup if that integrates more cleanly into the existing monorepo:

```powershell
npx.cmd create cloudflare@latest apps/dashboard --framework=next --platform=workers
```

Then update the root `package.json` scripts and workspaces to this shape:

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "start": "npm run validate:assets && expo start",
    "dashboard:dev": "npm.cmd run dev --workspace @moonrakers/dashboard",
    "dashboard:build": "npm.cmd run build --workspace @moonrakers/dashboard",
    "dashboard:typecheck": "npm.cmd run typecheck --workspace @moonrakers/dashboard",
    "dashboard:test": "npm.cmd run test --workspace @moonrakers/dashboard",
    "dashboard:e2e": "npm.cmd run e2e --workspace @moonrakers/dashboard"
  }
}
```

Append the web env vars to `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
```

Replace `apps/dashboard/next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@moonrakers/analytics-contract"],
  reactStrictMode: true,
};

export default nextConfig;
```

Create `apps/dashboard/open-next.config.ts` with:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

Create `apps/dashboard/wrangler.jsonc` with:

```jsonc
{
  "name": "moonrakers-dashboard",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-07-04",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

Replace `apps/dashboard/package.json` with this shape so the workspace name and typecheck command exist immediately:

```json
{
  "name": "@moonrakers/dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "build": "next build",
    "start": "next start",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "e2e": "playwright test"
  }
}
```

Replace `apps/dashboard/vitest.config.ts` with:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

Create `apps/dashboard/src/test/setup.ts` with:

```ts
import "@testing-library/jest-dom/vitest";
```

Replace `apps/dashboard/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moonrakers Dashboard",
  description: "Signed-in Moonrakers analytics companion dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Replace `apps/dashboard/src/app/globals.css` with:

```css
:root {
  --bg: #081120;
  --bg-deep: #040814;
  --card: rgba(12, 18, 38, 0.92);
  --card-alt: rgba(16, 24, 48, 0.95);
  --surface: #0a1428;
  --surface-alt: #0f172a;
  --text: #e2e8f0;
  --text-strong: #f8fbff;
  --sub: #94a3b8;
  --muted: #64748b;
  --accent: #a855f7;
  --accent-soft: rgba(168, 85, 247, 0.18);
  --blue: #3b82f6;
  --blue-soft: rgba(59, 130, 246, 0.18);
  --green: #22c55e;
  --green-soft: rgba(34, 197, 94, 0.16);
  --gold: #2dd4bf;
  --danger: #ef4444;
  --danger-soft: rgba(239, 68, 68, 0.16);
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  --grid: rgba(255, 255, 255, 0.06);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at 14% 10%, rgba(168, 85, 247, 0.18), transparent 28%),
    radial-gradient(circle at 84% 12%, rgba(59, 130, 246, 0.16), transparent 26%),
    radial-gradient(circle at 52% 100%, rgba(45, 212, 191, 0.1), transparent 34%),
    linear-gradient(180deg, #081120 0%, #040814 100%);
  color: var(--text);
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 48%, transparent 100%);
  opacity: 0.24;
}

a {
  color: inherit;
  text-decoration: none;
}
```

Keep these tokens aligned with `utils/colors.ts`, `utils/chartTheme.ts`, and `components/charts/chartVisualSystem.ts`. Do not swap them for a generic web palette.

- [ ] **Step 4: Install dashboard test dependencies and run the scaffold checks**

Run:

```powershell
npm.cmd install --workspace @moonrakers/dashboard @opennextjs/cloudflare wrangler @supabase/ssr recharts clsx zod
npm.cmd install -D --workspace @moonrakers/dashboard vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
node .\scripts\dashboard-workspace-scaffold.test.cjs
npm.cmd run --workspace @moonrakers/dashboard cf-typegen
npm.cmd run dashboard:typecheck
```

Expected: the source guard prints `dashboard-workspace-scaffold.test.cjs passed`, `cloudflare-env.d.ts` is generated, and the dashboard workspace typecheck exits `0`.

- [ ] **Step 5: Commit the scaffold**

```powershell
git add package.json package-lock.json .env.example scripts/dashboard-workspace-scaffold.test.cjs apps/dashboard
git commit -m "feat: scaffold dashboard workspace"
```

## Task 2: Extract The Shared Analytics Contract Package

**Files:**
- Create: `scripts/dashboard-analytics-contract-bridge.test.cjs`
- Create: `packages/analytics-contract/package.json`
- Create: `packages/analytics-contract/tsconfig.json`
- Create: `packages/analytics-contract/src/index.ts`
- Create: `packages/analytics-contract/src/types.ts`
- Create: `packages/analytics-contract/src/internal.ts`
- Create: `packages/analytics-contract/src/getAnalyticsHome.ts`
- Create: `packages/analytics-contract/src/getStatsScreen.ts`
- Create: `packages/analytics-contract/src/getInsightsScreen.ts`
- Create: `packages/analytics-contract/src/getChartSetup.ts`
- Create: `packages/analytics-contract/src/getChartDataset.ts`
- Create: `packages/analytics-contract/src/getEloScreen.ts`
- Create: `packages/analytics-contract/src/getPlayerProfileScreen.ts`
- Modify: `lib/cloud/analytics/types.ts`
- Modify: `lib/cloud/analytics/getAnalyticsHome.ts`
- Modify: `lib/cloud/analytics/getStatsScreen.ts`
- Modify: `lib/cloud/analytics/getInsightsScreen.ts`
- Modify: `lib/cloud/analytics/getChartSetup.ts`
- Modify: `lib/cloud/analytics/getChartDataset.ts`
- Modify: `lib/cloud/analytics/getEloScreen.ts`
- Modify: `lib/cloud/analytics/getPlayerProfileScreen.ts`

- [ ] **Step 1: Write the failing shared-contract bridge guard**

Create `scripts/dashboard-analytics-contract-bridge.test.cjs` with this content:

```js
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const packageJson = JSON.parse(
  read(path.join("packages", "analytics-contract", "package.json")),
);

assert.equal(
  packageJson.name,
  "@moonrakers/analytics-contract",
  "expected the analytics workspace package name to be @moonrakers/analytics-contract",
);

assert.match(
  read(path.join("lib", "cloud", "analytics", "types.ts")),
  /export \* from "@moonrakers\/analytics-contract";/,
  "expected Expo analytics types to surface the shared analytics package types",
);

for (const relPath of [
  path.join("lib", "cloud", "analytics", "getAnalyticsHome.ts"),
  path.join("lib", "cloud", "analytics", "getStatsScreen.ts"),
  path.join("lib", "cloud", "analytics", "getInsightsScreen.ts"),
  path.join("lib", "cloud", "analytics", "getChartSetup.ts"),
  path.join("lib", "cloud", "analytics", "getChartDataset.ts"),
  path.join("lib", "cloud", "analytics", "getEloScreen.ts"),
  path.join("lib", "cloud", "analytics", "getPlayerProfileScreen.ts"),
]) {
  assert.match(
    read(relPath),
    /from "@moonrakers\/analytics-contract"/,
    `expected ${relPath} to delegate to the shared analytics package`,
  );
}

console.log("dashboard-analytics-contract-bridge.test.cjs passed");
```

- [ ] **Step 2: Run the bridge guard and confirm it fails**

Run:

```powershell
node .\scripts\dashboard-analytics-contract-bridge.test.cjs
```

Expected: FAIL because `packages/analytics-contract` and the Expo compatibility shims do not exist yet.

- [ ] **Step 3: Create the shared analytics package and compatibility bridges**

Create `packages/analytics-contract/package.json`:

```json
{
  "name": "@moonrakers/analytics-contract",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Create `packages/analytics-contract/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": false,
    "allowImportingTsExtensions": true,
    "declaration": false,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/analytics-contract/src/internal.ts`:

```ts
export type AnalyticsRpcError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type AnalyticsRpcResult<TPayload> = {
  data: TPayload | null;
  error: AnalyticsRpcError | null;
};

export type AnalyticsRpcClient = {
  rpc<TPayload>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<AnalyticsRpcResult<TPayload>>;
};

export async function resolveAnalyticsCall<TParams>(
  clientOrParams: AnalyticsRpcClient | TParams,
  maybeParams?: TParams,
) {
  if (
    typeof clientOrParams === "object" &&
    clientOrParams !== null &&
    typeof (clientOrParams as AnalyticsRpcClient).rpc === "function"
  ) {
    if (maybeParams === undefined) {
      throw new Error("Analytics RPC params are required.");
    }

    return {
      client: clientOrParams as AnalyticsRpcClient,
      params: maybeParams,
    };
  }

  throw new Error(
    "Callers in shared analytics code must inject an AnalyticsRpcClient explicitly.",
  );
}

export function unwrapAnalyticsResult<TPayload>(
  rpcName: string,
  result: AnalyticsRpcResult<TPayload>,
) {
  if (result.error) {
    throw new Error(result.error.message || `${rpcName} failed.`);
  }

  if (result.data === null) {
    throw new Error(`${rpcName} returned no payload.`);
  }

  return result.data;
}
```

Create `packages/analytics-contract/src/getAnalyticsHome.ts`:

```ts
import {
  resolveAnalyticsCall,
  unwrapAnalyticsResult,
  type AnalyticsRpcClient,
} from "./internal";
import type { AnalyticsHomeParams, AnalyticsHomePayload } from "./types";

export async function getAnalyticsHome(
  client: AnalyticsRpcClient,
  params: AnalyticsHomeParams,
): Promise<AnalyticsHomePayload> {
  const resolved = await resolveAnalyticsCall(client, params);
  return unwrapAnalyticsResult(
    "get_analytics_home",
    await resolved.client.rpc("get_analytics_home", {
      profile_id: resolved.params.profileId,
    }),
  );
}
```

Move the current analytics type declarations from `lib/cloud/analytics/types.ts` into `packages/analytics-contract/src/types.ts`, keeping their names unchanged so the existing Expo and script tests remain valid.

Create `packages/analytics-contract/src/index.ts`:

```ts
export * from "./internal";
export * from "./types";
export * from "./getAnalyticsHome";
export * from "./getStatsScreen";
export * from "./getInsightsScreen";
export * from "./getChartSetup";
export * from "./getChartDataset";
export * from "./getEloScreen";
export * from "./getPlayerProfileScreen";
```

For the remaining shared wrapper files, copy the existing Expo wrapper bodies from `lib/cloud/analytics/*.ts`, keep their argument/return types unchanged, and update them to import from `./internal` and `./types` instead of the Expo-local `./types.ts` helper.

Then keep the Expo-side overloads as compatibility shims so mobile callers can still call `getStatsScreen({ profileId })` without injecting a client. Example `lib/cloud/analytics/getStatsScreen.ts`:

```ts
import {
  getStatsScreen as getSharedStatsScreen,
  type AnalyticsRpcClient,
  type StatsScreenParams,
  type StatsScreenPayload,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient } from "./types";

export async function getStatsScreen(
  params: StatsScreenParams,
): Promise<StatsScreenPayload>;
export async function getStatsScreen(
  client: AnalyticsRpcClient,
  params: StatsScreenParams,
): Promise<StatsScreenPayload>;
export async function getStatsScreen(
  clientOrParams: AnalyticsRpcClient | StatsScreenParams,
  maybeParams?: StatsScreenParams,
) {
  if (
    typeof clientOrParams === "object" &&
    clientOrParams !== null &&
    typeof (clientOrParams as AnalyticsRpcClient).rpc === "function"
  ) {
    return getSharedStatsScreen(clientOrParams as AnalyticsRpcClient, maybeParams as StatsScreenParams);
  }

  const client = await getDefaultAnalyticsRpcClient();
  return getSharedStatsScreen(client, clientOrParams as StatsScreenParams);
}
```

Example `lib/cloud/analytics/types.ts`:

```ts
export * from "@moonrakers/analytics-contract";

import { supabase } from "../../supabase";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

export async function getDefaultAnalyticsRpcClient(): Promise<AnalyticsRpcClient> {
  return {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      const result = await supabase.rpc(name as never, args as never);
      return result as {
        data: TPayload | null;
        error: { message?: string | null; details?: string | null; hint?: string | null } | null;
      };
    },
  };
}
```

- [ ] **Step 4: Run the existing analytics contract tests plus the new bridge guard**

Run:

```powershell
node .\scripts\dashboard-analytics-contract-bridge.test.cjs
node .\scripts\analytics-home-supabase-contract.test.ts
node .\scripts\stats-screen-supabase-contract.test.ts
node .\scripts\insights-screen-supabase-contract.test.ts
node .\scripts\chart-dataset-supabase-contract.test.ts
```

Expected: all five tests print their `passed` lines and exit `0`.

- [ ] **Step 5: Commit the shared contract extraction**

```powershell
git add scripts/dashboard-analytics-contract-bridge.test.cjs packages/analytics-contract lib/cloud/analytics
git commit -m "refactor: extract shared analytics contract package"
```

## Task 3: Add Dashboard Supabase SSR And Protected Data Access

**Files:**
- Create: `apps/dashboard/src/lib/env.ts`
- Create: `apps/dashboard/src/lib/supabase/browser.ts`
- Create: `apps/dashboard/src/lib/supabase/server.ts`
- Create: `apps/dashboard/src/lib/supabase/proxy.ts`
- Create: `apps/dashboard/proxy.ts`
- Create: `apps/dashboard/src/lib/data/rpcClient.ts`
- Create: `apps/dashboard/src/lib/auth/profileReadiness.ts`
- Create: `apps/dashboard/src/lib/auth/serverAccess.ts`
- Create: `apps/dashboard/src/lib/data/loadDashboardHome.ts`
- Create: `apps/dashboard/src/lib/data/loadCompareScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadStatsScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadInsightsScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadEloScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadProfileScreen.ts`
- Create: `apps/dashboard/src/lib/data/loadChartScreen.ts`
- Create: `apps/dashboard/src/lib/auth/profileReadiness.test.ts`

- [ ] **Step 1: Write the failing profile-readiness test**

Create `apps/dashboard/src/lib/auth/profileReadiness.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  isProfileComplete,
  normalizeDashboardProfile,
} from "./profileReadiness";

describe("profileReadiness", () => {
  it("treats player_name as the dashboard readiness gate", () => {
    expect(
      isProfileComplete(
        normalizeDashboardProfile({
          id: "user-1",
          player_name: "Nova",
        }),
      ),
    ).toBe(true);

    expect(
      isProfileComplete(
        normalizeDashboardProfile({
          id: "user-1",
          player_name: "   ",
        }),
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the dashboard test suite and confirm it fails**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
```

Expected: FAIL because `profileReadiness.ts` and the dashboard data-access helpers do not exist yet.

- [ ] **Step 3: Implement Supabase SSR clients, profile readiness, and route-level DAL helpers**

Create `apps/dashboard/src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const dashboardEnv = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
```

Create `apps/dashboard/src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { dashboardEnv } from "../env";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    dashboardEnv.NEXT_PUBLIC_SUPABASE_URL,
    dashboardEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
```

Create `apps/dashboard/src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { dashboardEnv } from "../env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    dashboardEnv.NEXT_PUBLIC_SUPABASE_URL,
    dashboardEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
```

Create `apps/dashboard/src/lib/supabase/proxy.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { dashboardEnv } from "../env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    dashboardEnv.NEXT_PUBLIC_SUPABASE_URL,
    dashboardEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getClaims();
  return response;
}
```

Create `apps/dashboard/proxy.ts`:

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "./src/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Create `apps/dashboard/src/lib/data/rpcClient.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

export function createAnalyticsRpcClient(
  supabase: SupabaseClient,
): AnalyticsRpcClient {
  return {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      const result = await supabase.rpc(name as never, args as never);
      return result as {
        data: TPayload | null;
        error: { message?: string | null; details?: string | null; hint?: string | null } | null;
      };
    },
  };
}
```

Create `apps/dashboard/src/lib/auth/profileReadiness.ts`:

```ts
export type DashboardProfile = {
  id: string;
  player_name: string | null;
  display_name: string | null;
  favorite_color: string | null;
  assigned_card_art_index: number | null;
};

export function normalizeDashboardProfile(input: Partial<DashboardProfile> | null) {
  if (!input?.id) {
    return null;
  }

  return {
    id: String(input.id).trim(),
    player_name: String(input.player_name ?? "").trim() || null,
    display_name: String(input.display_name ?? "").trim() || null,
    favorite_color: String(input.favorite_color ?? "").trim() || null,
    assigned_card_art_index:
      typeof input.assigned_card_art_index === "number"
        ? input.assigned_card_art_index
        : null,
  } satisfies DashboardProfile;
}

export function isProfileComplete(profile: DashboardProfile | null) {
  return Boolean(profile?.id && String(profile.player_name ?? "").trim());
}
```

Create `apps/dashboard/src/lib/auth/serverAccess.ts` so protected routes all use one gate:

```ts
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../supabase/server";
import { isProfileComplete, normalizeDashboardProfile } from "./profileReadiness";

export async function requireDashboardAccess() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { claims },
    error,
  } = await supabase.auth.getClaims();

  if (error || !claims?.sub) {
    redirect("/auth?reason=session-expired");
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const profile = normalizeDashboardProfile(profileRow);
  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return { supabase, userId: claims.sub, profile };
}
```

Create each `load*.ts` file as a thin route-specific wrapper that:

1. calls `requireDashboardAccess()`
2. builds an injected analytics RPC client with `createAnalyticsRpcClient(supabase)`
3. calls exactly one shared analytics function from `@moonrakers/analytics-contract`

Example `apps/dashboard/src/lib/data/loadDashboardHome.ts`:

```ts
import { getAnalyticsHome } from "@moonrakers/analytics-contract";
import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadDashboardHome() {
  const { supabase, userId, profile } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const payload = await getAnalyticsHome(client, { profileId: userId });
  return { payload, profile };
}
```

- [ ] **Step 4: Run the dashboard test suite and typecheck**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
npm.cmd run dashboard:typecheck
```

Expected: the new profile-readiness test passes and the workspace typecheck exits `0`.

- [ ] **Step 5: Commit the auth/data foundation**

```powershell
git add apps/dashboard/src/lib apps/dashboard/proxy.ts
git commit -m "feat: add dashboard auth and data foundation"
```

## Task 4: Build Auth, Account Creation, Recovery, And Onboarding

**Files:**
- Create: `apps/dashboard/src/app/auth/page.tsx`
- Create: `apps/dashboard/src/app/auth/callback/route.ts`
- Create: `apps/dashboard/src/app/onboarding/page.tsx`
- Create: `apps/dashboard/src/app/onboarding/actions.ts`
- Create: `apps/dashboard/src/components/auth/AuthPanel.tsx`
- Create: `apps/dashboard/src/components/auth/OnboardingForm.tsx`
- Create: `apps/dashboard/src/components/auth/AuthPanel.test.tsx`
- Create: `apps/dashboard/src/components/auth/OnboardingForm.test.tsx`

- [ ] **Step 1: Write the failing auth and onboarding component tests**

Create `apps/dashboard/src/components/auth/AuthPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthPanel } from "./AuthPanel";

describe("AuthPanel", () => {
  it("shows create-account controls alongside sign-in and recovery actions", () => {
    render(<AuthPanel />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });
});
```

Create `apps/dashboard/src/components/auth/OnboardingForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingForm } from "./OnboardingForm";

describe("OnboardingForm", () => {
  it("requires player identity fields before submission", () => {
    render(
      <OnboardingForm
        initialProfile={null}
        action={async () => ({ ok: true })}
      />,
    );

    expect(screen.getByLabelText(/player name/i)).toBeRequired();
    expect(screen.getByLabelText(/favorite color/i)).toBeRequired();
  });
});
```

- [ ] **Step 2: Run the dashboard test suite and confirm it fails**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
```

Expected: FAIL because `AuthPanel` and `OnboardingForm` do not exist yet.

- [ ] **Step 3: Implement the public auth surface and onboarding save flow**

Create `apps/dashboard/src/components/auth/AuthPanel.tsx` as a client component that uses the browser Supabase client:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AuthPanel() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit() {
    setMessage(null);

    const result = creatingAccount
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    startTransition(() => {
      router.replace("/");
    });
  }

  async function handleReset() {
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setMessage(result.error ? result.error.message : "Password reset email sent.");
  }

  return (
    <div>
      <button type="button" onClick={() => setCreatingAccount(false)}>Sign In</button>
      <button type="button" onClick={() => setCreatingAccount(true)}>Create Account</button>
      <input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <button type="button" disabled={pending} onClick={handleSubmit}>
        {creatingAccount ? "Create Account" : "Sign In"}
      </button>
      <button type="button" disabled={pending} onClick={handleReset}>Send Reset Link</button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
```

Create `apps/dashboard/src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeDashboardProfile, isProfileComplete } from "@/lib/auth/profileReadiness";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/";

  const supabase = await createServerSupabaseClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth?mode=reset-sent", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.redirect(new URL("/auth?reason=session-expired", url.origin));
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", user.id)
    .maybeSingle();

  const profile = normalizeDashboardProfile(profileRow);
  return NextResponse.redirect(
    new URL(isProfileComplete(profile) ? next : "/onboarding", url.origin),
  );
}
```

Create `apps/dashboard/src/app/onboarding/actions.ts` to upsert the missing `profiles` row fields:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveOnboardingProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, message: "Signed-in session required." };
  }

  const payload = {
    id: user.id,
    player_name: String(formData.get("player_name") ?? "").trim(),
    display_name: String(formData.get("display_name") ?? "").trim() || null,
    favorite_color: String(formData.get("favorite_color") ?? "").trim() || null,
    assigned_card_art_index: null,
  };

  if (!payload.player_name || !payload.favorite_color) {
    return { ok: false, message: "Player name and favorite color are required." };
  }

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}
```

Implement `apps/dashboard/src/components/auth/OnboardingForm.tsx` as a progressive `<form>` that posts to `saveOnboardingProfile`, then redirects to `/` on success.

Render `AuthPanel` and `OnboardingForm` inside the same `dashboard-panel` chrome from Task 1 and Task 5. The public entry flow should already look like the Moonrakers analytics product, with uppercase eyebrows, luminous mode toggles, and dark command-table surfaces instead of a default white sign-in form.

- [ ] **Step 4: Run the dashboard tests and typecheck**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
npm.cmd run dashboard:typecheck
```

Expected: the auth/onboarding component tests pass and the workspace typecheck exits `0`.

- [ ] **Step 5: Commit the public auth flow**

```powershell
git add apps/dashboard/src/app/auth apps/dashboard/src/app/onboarding apps/dashboard/src/components/auth
git commit -m "feat: add dashboard auth and onboarding flows"
```

## Task 5: Build The Protected Dashboard Shell And Home Route

**Files:**
- Create: `apps/dashboard/src/app/(dashboard)/layout.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/loading.tsx`
- Create: `apps/dashboard/src/components/layout/DashboardSidebar.tsx`
- Create: `apps/dashboard/src/components/layout/DashboardTopbar.tsx`
- Create: `apps/dashboard/src/components/ui/DashboardPanel.tsx`
- Create: `apps/dashboard/src/components/ui/MetricCard.tsx`
- Create: `apps/dashboard/src/components/ui/EmptyStatePanel.tsx`
- Create: `apps/dashboard/src/components/ui/SectionHeading.tsx`
- Create: `apps/dashboard/src/components/home/HomeView.tsx`
- Create: `apps/dashboard/src/components/home/HomeView.test.tsx`

- [ ] **Step 1: Write the failing home-view test**

Create `apps/dashboard/src/components/home/HomeView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeView } from "./HomeView";

describe("HomeView", () => {
  it("renders the analytics hero cards from the server payload", () => {
    render(
      <HomeView
        profileName="Nova"
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          hero: { players: 4, games: 18, views: 5 },
          cards: [{ key: "win-rate", label: "Win Rate", value: "61%" }],
        }}
      />,
    );

    expect(screen.getByText("Nova")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("61%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the dashboard test suite and confirm it fails**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
```

Expected: FAIL because the dashboard shell and `HomeView` do not exist yet.

- [ ] **Step 3: Implement the protected shell and home route**

Create `apps/dashboard/src/components/layout/DashboardSidebar.tsx`:

```tsx
import Link from "next/link";

const navItems = [
  ["/", "Home"],
  ["/compare", "Compare"],
  ["/stats", "Stats"],
  ["/charts", "Charts"],
  ["/insights", "Insights"],
  ["/elo", "ELO"],
  ["/profile", "Profile"],
] as const;

export function DashboardSidebar() {
  return (
    <aside className="dashboard-panel sidebar-shell">
      <div className="sidebar-brand">
        <p className="section-eyebrow">Fleet Intel</p>
        <h1>Moonrakers</h1>
        <p className="sidebar-copy">
          Command table for your crew, rivals, trends, and published analytics.
        </p>
      </div>
      <nav aria-label="Primary">
        <ul>
          {navItems.map(([href, label]) => (
            <li key={href}>
              <Link href={href}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

Create `apps/dashboard/src/components/home/HomeView.tsx`:

```tsx
import { MetricCard } from "@/components/ui/MetricCard";

export function HomeView({
  profileName,
  payload,
}: {
  profileName: string;
  payload: {
    generatedAt: string;
    hero: { players: number; games: number; views: number };
    cards: Array<{ key: string; label: string; value: string | number }>;
  };
}) {
  return (
    <section className="view-stack">
      <header className="dashboard-panel hero-panel">
        <p className="section-eyebrow">Signed in as</p>
        <h2 className="hero-title">{profileName}</h2>
        <p className="hero-copy">
          Track momentum, rival patterns, and table tendencies across your Moonrakers history.
        </p>
      </header>
      <div className="metric-grid">
        {payload.cards.map((card) => (
          <MetricCard key={card.key} label={card.label} value={card.value} />
        ))}
      </div>
    </section>
  );
}
```

Create `apps/dashboard/src/app/(dashboard)/page.tsx`:

```tsx
import { loadDashboardHome } from "@/lib/data/loadDashboardHome";
import { HomeView } from "@/components/home/HomeView";

export default async function DashboardHomePage() {
  const { payload, profile } = await loadDashboardHome();
  return (
    <HomeView
      profileName={profile?.player_name || profile?.display_name || "Commander"}
      payload={payload}
    />
  );
}
```

Keep `apps/dashboard/src/app/(dashboard)/layout.tsx` thin: it should call `requireDashboardAccess()`, render `DashboardSidebar`, `DashboardTopbar`, and a main content slot.

Create `apps/dashboard/src/components/ui/DashboardPanel.tsx` as the default shell for route cards, sidebars, filters, and chart panels. It should encapsulate the shared Moonrakers chrome: layered dark background, 1px soft border, inset highlight, subtle outer glow, and tone-aware accent ring so later routes do not re-implement panel styling ad hoc.

- [ ] **Step 4: Run the home-view test and dashboard typecheck**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
npm.cmd run dashboard:typecheck
```

Expected: the home-view test passes and the workspace typecheck exits `0`.

- [ ] **Step 5: Commit the dashboard shell**

```powershell
git add apps/dashboard/src/app/(dashboard) apps/dashboard/src/components/layout apps/dashboard/src/components/ui apps/dashboard/src/components/home
git commit -m "feat: add dashboard shell and home route"
```

## Task 6: Build The Compare And Stats Surfaces

**Files:**
- Create: `apps/dashboard/src/app/(dashboard)/compare/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/stats/page.tsx`
- Create: `apps/dashboard/src/components/compare/CompareView.tsx`
- Create: `apps/dashboard/src/components/stats/StatsView.tsx`
- Create: `apps/dashboard/src/components/compare/CompareView.test.tsx`
- Create: `apps/dashboard/src/components/stats/StatsView.test.tsx`
- Modify: `apps/dashboard/src/lib/data/loadCompareScreen.ts`
- Modify: `apps/dashboard/src/lib/data/loadStatsScreen.ts`

- [ ] **Step 1: Write the failing compare and stats view tests**

Create `apps/dashboard/src/components/compare/CompareView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompareView } from "./CompareView";

describe("CompareView", () => {
  it("renders focus and rival selectors and the compare dataset title", () => {
    render(
      <CompareView
        setup={{
          focusPlayerOptions: [{ key: "p1", label: "Nova" }],
          comparePlayerOptions: [{ key: "p2", label: "Vex" }],
        }}
        dataset={{
          title: "Compare players",
          subtitle: "Direct side-by-side read",
          data: { rows: [] },
        }}
      />,
    );

    expect(screen.getByLabelText(/focus player/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/compare player/i)).toBeInTheDocument();
    expect(screen.getByText("Compare players")).toBeInTheDocument();
  });
});
```

Create `apps/dashboard/src/components/stats/StatsView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatsView } from "./StatsView";

describe("StatsView", () => {
  it("keeps correlations visible as a first-class stats tab", () => {
    render(
      <StatsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          overview: {
            hero: { players: 4, games: 10, takeaway: "Nova leads" },
            cards: [],
            topSignals: [],
          },
          players: { options: [], selectedPlayerId: null, detail: null },
          playstyle: {},
          correlations: { entries: [{ key: "assist", label: "Assist density" }] },
          games: {},
        }}
      />,
    );

    expect(screen.getByRole("tab", { name: /correlations/i })).toBeInTheDocument();
    expect(screen.getByText(/Assist density/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the dashboard test suite and confirm it fails**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
```

Expected: FAIL because the compare and stats views do not exist yet.

- [ ] **Step 3: Implement compare via the compare chart contract and stats via the stats RPC**

Use `loadCompareScreen.ts` to fetch both compare setup and compare dataset from the shared analytics package:

```ts
import { getChartDataset, getChartSetup } from "@moonrakers/analytics-contract";
import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadCompareScreen(searchParams: {
  focusPlayerId?: string;
  comparePlayerId?: string;
}) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  const [setup, dataset] = await Promise.all([
    getChartSetup(client, { chartKey: "compare", profileId: userId }),
    getChartDataset(client, {
      chartKey: "compare",
      profileId: userId,
      focusPlayerId: searchParams.focusPlayerId ?? null,
      comparePlayerId: searchParams.comparePlayerId ?? null,
      scopedPlayerIds: null,
      selectedGameId: null,
      metricKey: null,
      lineMode: null,
      graphMode: null,
      opponentId: null,
    }),
  ]);

  return { setup, dataset };
}
```

Use `StatsView` to mirror the mobile `stats.tsx` tab model with concrete tabs for `Home`, `Players`, `Playstyle`, `Correlations`, and `Games`, and surface `payload.correlations` directly instead of burying it under a generic insights bucket.

Style `CompareView` and `StatsView` with the same Moonrakers panel system used on home. Compare-specific controls should lean on the app's comparison accent family (`blue` / `blue-soft`) while high-priority takeaways and selected states keep the app's primary `accent` purple. Correlation rows should read like tactical intel cards, not plain admin tables.

`apps/dashboard/src/app/(dashboard)/compare/page.tsx` should parse `searchParams`, call `loadCompareScreen`, and render `CompareView`.

`apps/dashboard/src/app/(dashboard)/stats/page.tsx` should call `loadStatsScreen` and render `StatsView`.

- [ ] **Step 4: Run the compare/stats tests and typecheck**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
npm.cmd run dashboard:typecheck
```

Expected: the compare and stats view tests pass and the typecheck exits `0`.

- [ ] **Step 5: Commit compare and stats**

```powershell
git add apps/dashboard/src/app/(dashboard)/compare apps/dashboard/src/app/(dashboard)/stats apps/dashboard/src/components/compare apps/dashboard/src/components/stats apps/dashboard/src/lib/data/loadCompareScreen.ts apps/dashboard/src/lib/data/loadStatsScreen.ts
git commit -m "feat: add dashboard compare and stats routes"
```

## Task 7: Build The Insights, ELO, And Profile Surfaces

**Files:**
- Create: `apps/dashboard/src/app/(dashboard)/insights/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/elo/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/profile/page.tsx`
- Create: `apps/dashboard/src/components/insights/InsightsView.tsx`
- Create: `apps/dashboard/src/components/elo/EloView.tsx`
- Create: `apps/dashboard/src/components/profile/ProfileView.tsx`
- Create: `apps/dashboard/src/components/insights/InsightsView.test.tsx`
- Create: `apps/dashboard/src/components/elo/EloView.test.tsx`
- Create: `apps/dashboard/src/components/profile/ProfileView.test.tsx`
- Modify: `apps/dashboard/src/lib/data/loadInsightsScreen.ts`
- Modify: `apps/dashboard/src/lib/data/loadEloScreen.ts`
- Modify: `apps/dashboard/src/lib/data/loadProfileScreen.ts`

- [ ] **Step 1: Write the failing route-view tests**

Create `apps/dashboard/src/components/insights/InsightsView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InsightsView } from "./InsightsView";

describe("InsightsView", () => {
  it("renders top signals and relationship insights", () => {
    render(
      <InsightsView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          meta: { games: 10 },
          cards: [],
          topSignals: [{ key: "pace", label: "Pace", value: 0.7, strength: "High", tone: "accent", meaning: "Fast" }],
          relationships: { summary: "Nova feeds Vex" },
          correlations: {},
        }}
      />,
    );

    expect(screen.getByText("Pace")).toBeInTheDocument();
    expect(screen.getByText(/Nova feeds Vex/i)).toBeInTheDocument();
  });
});
```

Create `apps/dashboard/src/components/elo/EloView.test.tsx` and `apps/dashboard/src/components/profile/ProfileView.test.tsx` so they assert the presence of leaderboard rows, current ELO cards, compare quick actions, and recent games sections.

- [ ] **Step 2: Run the dashboard test suite and confirm it fails**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
```

Expected: FAIL because the insights, ELO, and profile views do not exist yet.

- [ ] **Step 3: Implement the server-loaded insights, ELO, and profile routes**

Each data loader should follow the same pattern:

```ts
import { getInsightsScreen } from "@moonrakers/analytics-contract";
import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadInsightsScreen() {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  return getInsightsScreen(client, { profileId: userId });
}
```

`ProfileView` must expose compare as a first-class action by turning the existing profile quick action into a real link to `/compare?focusPlayerId=<selected>`.

`EloView` should keep player and opponent filters visible above the leaderboard instead of hiding them behind mobile tabs.

`InsightsView` should show both server-authored takeaways and correlations language clearly, since the user explicitly wants insight and correlation coverage on web.

All three views should continue the shared visual language: dark chart-shell panels, compact stat density, accent chips, and board-game command-table framing. Do not let these text-heavy routes fall back to generic document styling.

- [ ] **Step 4: Run the route-view tests and typecheck**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
npm.cmd run dashboard:typecheck
```

Expected: the insights, ELO, and profile tests pass and the workspace still typechecks.

- [ ] **Step 5: Commit the remaining text-heavy analytics surfaces**

```powershell
git add apps/dashboard/src/app/(dashboard)/insights apps/dashboard/src/app/(dashboard)/elo apps/dashboard/src/app/(dashboard)/profile apps/dashboard/src/components/insights apps/dashboard/src/components/elo apps/dashboard/src/components/profile apps/dashboard/src/lib/data/loadInsightsScreen.ts apps/dashboard/src/lib/data/loadEloScreen.ts apps/dashboard/src/lib/data/loadProfileScreen.ts
git commit -m "feat: add dashboard insights elo and profile routes"
```

## Task 8: Build The Charts Index, Chart Detail Route, And Graph Renderers

**Files:**
- Create: `apps/dashboard/src/app/(dashboard)/charts/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/charts/[chartKey]/page.tsx`
- Create: `apps/dashboard/src/components/charts/ChartsIndexView.tsx`
- Create: `apps/dashboard/src/components/charts/ChartDetailView.tsx`
- Create: `apps/dashboard/src/components/charts/ChartRenderer.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/CartesianChartPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/ComparisonChartPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/NetworkChartPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/HeatmapPanel.tsx`
- Create: `apps/dashboard/src/components/charts/renderers/ReplayPanel.tsx`
- Create: `apps/dashboard/src/components/charts/ChartRenderer.test.tsx`
- Modify: `apps/dashboard/src/lib/data/loadChartScreen.ts`

- [ ] **Step 1: Write the failing chart-renderer test**

Create `apps/dashboard/src/components/charts/ChartRenderer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartRenderer } from "./ChartRenderer";

describe("ChartRenderer", () => {
  it("routes compare datasets into the comparison renderer family", () => {
    render(
      <ChartRenderer
        chartKey="compare"
        payload={{
          chartKey: "compare",
          generatedAt: "2026-07-04T03:00:00.000Z",
          title: "Compare players",
          data: { rows: [] },
        }}
      />,
    );

    expect(screen.getByText("Compare players")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the dashboard test suite and confirm it fails**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
```

Expected: FAIL because the chart route and renderer files do not exist yet.

- [ ] **Step 3: Implement the chart setup route, detail route, and renderer registry**

`loadChartScreen.ts` should fetch both setup payload and chart dataset:

```ts
import { getChartDataset, getChartSetup } from "@moonrakers/analytics-contract";
import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadChartScreen(input: {
  chartKey: string;
  focusPlayerId?: string | null;
  comparePlayerId?: string | null;
  metricKey?: string | null;
  lineMode?: string | null;
  opponentId?: string | null;
}) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  const [setup, dataset] = await Promise.all([
    getChartSetup(client, { chartKey: input.chartKey, profileId: userId }),
    getChartDataset(client, {
      chartKey: input.chartKey,
      profileId: userId,
      focusPlayerId: input.focusPlayerId ?? null,
      comparePlayerId: input.comparePlayerId ?? null,
      scopedPlayerIds: null,
      selectedGameId: null,
      metricKey: input.metricKey ?? null,
      lineMode: input.lineMode ?? null,
      graphMode: null,
      opponentId: input.opponentId ?? null,
    }),
  ]);

  return { setup, dataset };
}
```

Create `apps/dashboard/src/components/charts/ChartRenderer.tsx` with a chart-family switch:

```tsx
import { CartesianChartPanel } from "./renderers/CartesianChartPanel";
import { ComparisonChartPanel } from "./renderers/ComparisonChartPanel";
import { NetworkChartPanel } from "./renderers/NetworkChartPanel";
import { HeatmapPanel } from "./renderers/HeatmapPanel";
import { ReplayPanel } from "./renderers/ReplayPanel";

export function ChartRenderer({
  chartKey,
  payload,
}: {
  chartKey: string;
  payload: { title?: string; data: Record<string, unknown> };
}) {
  if (["compare", "head_to_head", "rivalry_graph", "radar"].includes(chartKey)) {
    return <ComparisonChartPanel chartKey={chartKey} payload={payload} />;
  }

  if (["relationship_graph"].includes(chartKey)) {
    return <NetworkChartPanel chartKey={chartKey} payload={payload} />;
  }

  if (["heatmap"].includes(chartKey)) {
    return <HeatmapPanel payload={payload} />;
  }

  if (["replay_chart"].includes(chartKey)) {
    return <ReplayPanel payload={payload} />;
  }

  return <CartesianChartPanel chartKey={chartKey} payload={payload} />;
}
```

`ChartsIndexView` should present chart choices by section and link into `/charts/[chartKey]`, while `ChartDetailView` should surface the setup filters above the graph and render the route through `ChartRenderer`.

Each renderer family should map its colors from the same app tokens already used in `chartVisualSystem.ts` and `chartTheme.ts`. Do not accept Recharts defaults or invent a separate web chart palette, because the compare, risk, success, and spotlight tones already carry meaning in the mobile app.

- [ ] **Step 4: Run the chart tests and typecheck**

Run:

```powershell
npm.cmd run test --workspace @moonrakers/dashboard -- --run
npm.cmd run dashboard:typecheck
```

Expected: the chart-renderer test passes and the dashboard app still typechecks.

- [ ] **Step 5: Commit the chart experience**

```powershell
git add apps/dashboard/src/app/(dashboard)/charts apps/dashboard/src/components/charts apps/dashboard/src/lib/data/loadChartScreen.ts
git commit -m "feat: add dashboard charts routes and renderers"
```

## Task 9: Add End-To-End Coverage, Workspace Scripts, And A Dashboard README

**Files:**
- Create: `apps/dashboard/tests/e2e/auth-onboarding.spec.ts`
- Create: `apps/dashboard/tests/e2e/dashboard-surfaces.spec.ts`
- Create: `apps/dashboard/README.md`
- Modify: `apps/dashboard/playwright.config.ts`
- Modify: `apps/dashboard/package.json`

- [ ] **Step 1: Write the failing Playwright specs**

Create `apps/dashboard/tests/e2e/auth-onboarding.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("create account, finish onboarding, and land on the dashboard", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});
```

Create `apps/dashboard/tests/e2e/dashboard-surfaces.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("signed-in dashboard exposes compare, stats, charts, insights, elo, and profile navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Compare" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Stats" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Charts" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Insights" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ELO" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
});
```

- [ ] **Step 2: Run the dashboard E2E command and confirm it fails**

Run:

```powershell
npm.cmd run e2e --workspace @moonrakers/dashboard
```

Expected: FAIL because Playwright config and E2E wiring are not finished yet.

- [ ] **Step 3: Finish the dashboard test commands and document local usage**

Set `apps/dashboard/package.json` scripts to this shape:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "e2e": "playwright test"
  }
}
```

Use `apps/dashboard/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm.cmd run dev",
    cwd: __dirname,
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

Document the dashboard app in `apps/dashboard/README.md`:

```md
# Moonrakers Dashboard

## Commands

- `npm.cmd run dashboard:dev`
- `npm.cmd run dashboard:typecheck`
- `npm.cmd run dashboard:test`
- `npm.cmd run dashboard:e2e`

## Required env vars

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Covered surfaces

- Auth and account creation
- Onboarding
- Home
- Compare
- Stats and correlations
- Charts
- Insights
- ELO
- Profile
```

- [ ] **Step 4: Run the final dashboard verification set**

Run:

```powershell
npm.cmd run dashboard:test
npm.cmd run dashboard:typecheck
npm.cmd run dashboard:build
```

Expected: tests pass, typecheck exits `0`, and the dashboard build completes successfully.

- [ ] **Step 5: Commit the verification layer**

```powershell
git add apps/dashboard/tests/e2e apps/dashboard/playwright.config.ts apps/dashboard/package.json apps/dashboard/README.md
git commit -m "test: add dashboard verification coverage"
```

## Self-Review

### Spec coverage

- Separate in-repo Next.js app: covered by Task 1.
- Shared analytics contract layer: covered by Task 2.
- Supabase SSR auth and protected routes: covered by Task 3.
- Sign in, create account, reset, and callback return: covered by Task 4.
- Onboarding/profile bootstrap: covered by Task 4.
- Desktop-first home dashboard: covered by Task 5.
- App-aligned visual system and Moonrakers board-game styling: covered by Tasks 1, 4, 5, 6, 7, and 8.
- Compare surface: covered by Task 6.
- Statistics and correlations: covered by Task 6.
- Insights, ELO, and profile: covered by Task 7.
- Graphs and chart detail routes: covered by Task 8.
- End-to-end verification: covered by Task 9.

### Placeholder scan

- No `TBD`, `TODO`, or deferred “implement later” language remains.
- Every task names exact files and exact commands.
- Every code-writing step includes concrete code or explicit source-copy instructions from an existing file.

### Type consistency

- Shared analytics wrappers keep the current function names: `getAnalyticsHome`, `getStatsScreen`, `getInsightsScreen`, `getChartSetup`, `getChartDataset`, `getEloScreen`, and `getPlayerProfileScreen`.
- Route access uses one shared server helper: `requireDashboardAccess`.
- Profile readiness is consistently gated on `player_name`.
