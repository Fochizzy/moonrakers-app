import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": "/src",
      react: "/node_modules/react",
      "react-dom": "/node_modules/react-dom",
      "react-dom/client": "/node_modules/react-dom/client.js",
      "react/jsx-dev-runtime": "/node_modules/react/jsx-dev-runtime.js",
      "react/jsx-runtime": "/node_modules/react/jsx-runtime.js",
    },
  },
});
