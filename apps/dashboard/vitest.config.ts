import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vitest/config";

const dashboardRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dashboardRoot, "..", "..");
const requireFromConfig = createRequire(import.meta.url);

const RESOLVABLE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

function firstExistingPath(base: string) {
  for (const extension of RESOLVABLE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * `tsconfig.json` maps `@/*` to `./src/*` and then `../../*`, so dashboard code
 * and the shared app modules it pulls in both use the same prefix. A single
 * Vite alias can only point at one of those roots, which left imports like
 * `@/utils/seatAdvantage` (reached through the shared chart helpers)
 * unresolvable in tests. Try the same two roots in the same order.
 */
function tsconfigPathsPlugin(): Plugin {
  return {
    name: "dashboard-tsconfig-paths",
    enforce: "pre",
    resolveId(source) {
      if (!source.startsWith("@/")) {
        return null;
      }

      const relative = source.slice(2);

      return (
        firstExistingPath(path.join(dashboardRoot, "src", relative)) ??
        firstExistingPath(path.join(repoRoot, relative))
      );
    },
  };
}

/**
 * `@testing-library/react` is hoisted above this workspace, so Node resolves
 * its React copy from the install root rather than `apps/dashboard`. Vite
 * aliases never reach that copy because Vitest externalizes it, which leaves
 * the renderer and the components under test on two different React instances
 * and makes every hook call throw. Pin both sides to whichever React the
 * hoisted Testing Library sees so a test run has exactly one instance.
 */
function resolveSharedReactRoots() {
  const fallback = {
    react: path.join(dashboardRoot, "node_modules", "react"),
    reactDom: path.join(dashboardRoot, "node_modules", "react-dom"),
  };

  try {
    const requireFromTestingLibrary = createRequire(
      requireFromConfig.resolve("@testing-library/react/package.json", {
        paths: [dashboardRoot],
      }),
    );

    return {
      react: path.dirname(requireFromTestingLibrary.resolve("react")),
      reactDom: path.dirname(requireFromTestingLibrary.resolve("react-dom")),
    };
  } catch {
    return fallback;
  }
}

const reactRoots = resolveSharedReactRoots();

export default defineConfig({
  plugins: [tsconfigPathsPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: reactRoots.react,
      "react-dom": reactRoots.reactDom,
      "react-dom/client": path.join(reactRoots.reactDom, "client.js"),
      "react/jsx-dev-runtime": path.join(reactRoots.react, "jsx-dev-runtime.js"),
      "react/jsx-runtime": path.join(reactRoots.react, "jsx-runtime.js"),
    },
  },
});
