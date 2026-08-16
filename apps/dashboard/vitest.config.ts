import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const dashboardRoot = path.dirname(fileURLToPath(import.meta.url));
const requireFromConfig = createRequire(import.meta.url);

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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": "/src",
      react: reactRoots.react,
      "react-dom": reactRoots.reactDom,
      "react-dom/client": path.join(reactRoots.reactDom, "client.js"),
      "react/jsx-dev-runtime": path.join(reactRoots.react, "jsx-dev-runtime.js"),
      "react/jsx-runtime": path.join(reactRoots.react, "jsx-runtime.js"),
    },
  },
});
