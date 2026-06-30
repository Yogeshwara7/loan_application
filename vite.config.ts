import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin"

/**
 * Split heavy third-party dependencies into long-term-cacheable vendor chunks so
 * the app's own code (the main entry) stays small. Matching is by node_modules
 * directory boundary (not a bare substring) so packages aren't misrouted — e.g.
 * "@fluentui/react-components" must NOT fall into the "react" chunk.
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  const path = id.replace(/\\/g, "/");

  // react: React runtime + its scheduler + the router. These must ship together
  // as a single React copy and rarely change, so they cache well.
  if (
    path.includes("/node_modules/react/") ||
    path.includes("/node_modules/react-dom/") ||
    path.includes("/node_modules/scheduler/") ||
    path.includes("/node_modules/react-router/") ||
    path.includes("/node_modules/react-router-dom/")
  ) {
    return "react";
  }

  // fluentui: the entire Fluent UI v9 surface + its Griffel styling engine. This
  // is by far the largest dependency, so isolating it keeps the main bundle lean
  // and lets it cache independently of app code.
  if (path.includes("/node_modules/@fluentui/") || path.includes("/node_modules/@griffel/")) {
    return "fluentui";
  }

  // powerapps: the Microsoft Power Apps Code Apps SDK (generated services/runtime
  // depend on it). Grouped separately because it updates on a different cadence.
  if (path.includes("/node_modules/@microsoft/")) {
    return "powerapps";
  }

  // vendor: everything else from node_modules.
  return "vendor";
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), powerApps()],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
