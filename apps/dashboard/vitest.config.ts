import path from "node:path";
import { defineConfig } from "vitest/config";

const workspaceRoot = process.cwd();

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(workspaceRoot, "src/test/setup.ts")],
  },
  resolve: {
    alias: {
      "@": path.resolve(workspaceRoot, "src"),
      react: path.resolve(workspaceRoot, "node_modules/react"),
      "react-dom": path.resolve(workspaceRoot, "node_modules/react-dom"),
      "react-dom/client": path.resolve(
        workspaceRoot,
        "node_modules/react-dom/client.js",
      ),
      "react/jsx-dev-runtime": path.resolve(
        workspaceRoot,
        "node_modules/react/jsx-dev-runtime.js",
      ),
      "react/jsx-runtime": path.resolve(
        workspaceRoot,
        "node_modules/react/jsx-runtime.js",
      ),
    },
  },
});
