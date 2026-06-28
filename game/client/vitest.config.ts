import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Mirror vite.config so asset imports (.glb/.exr) reached through a test's
  // import graph resolve to a URL instead of being parsed as JS.
  assetsInclude: ["**/*.glb", "**/*.exr"],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/test/**",
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "build"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@glb": path.resolve(__dirname, "./src/assets/glb"),
      "@achievements": path.resolve(__dirname, "./src/assets/achievements"),
      "@players": path.resolve(__dirname, "./src/players"),
      "@GLBImports": path.resolve(__dirname, "./src/GLBImports"),
    },
  },
});
