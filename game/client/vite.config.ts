import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import gltf from "vite-plugin-gltf";
import { draco } from "@gltf-transform/functions";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import { compression } from "vite-plugin-compression2";
import { chunkSplitPlugin } from "vite-plugin-chunk-split";
import path from "path";

// https://vitejs.dev/config/
export default ({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd()));
  const useHttps = process.env.SSL === "true";
  const isProduction = mode === "production";

  const httpsConfig = useHttps
    ? {
        key: process.env.VITE_REACT_APP_SSL_KEY_FILE,
        cert: process.env.VITE_REACT_APP_SSL_CRT_FILE,
      }
    : undefined;

  return defineConfig({
    plugins: [
      react(),
      tailwindcss(),
      compression(),
      ViteImageOptimizer(),
      ViteMinifyPlugin(),
      gltf({
        transforms: [draco()],
      }),
      chunkSplitPlugin(),
    ],
    assetsInclude: ["**/*.glb", "**/*.exr"],

    define: {
      global: "globalThis",
      "process.env": {},
      // Injected at build time so worker URLs are cache-busted on each deploy.
      __WORKER_BUILD__: JSON.stringify(Date.now()),
    },

    build: {
      sourcemap: !isProduction,
      minify: isProduction ? "terser" : "esbuild",
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ["console.log", "console.info", "console.debug"],
            },
          }
        : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            // Simple vendor splitting (let chunkSplitPlugin handle the rest)
            "react-vendor": ["react", "react-dom"],
            "three-vendor": [
              "three",
              "@react-three/fiber",
              "@react-three/drei",
            ],
          },
        },
      },
      chunkSizeWarningLimit: 2000, // Warn if chunk > 2MB (3D games need larger bundles)
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "src/assets"),
        "@glb": path.resolve(__dirname, "src/assets/glb"),
        "@achievements": path.resolve(__dirname, "src/assets/achievements"),
        "@players": path.resolve(__dirname, "src/players"),
        "@GLBImports": path.resolve(__dirname, "src/GLBImports"),
        // Polyfills for Node.js modules used by Cartridge/Starknet libraries
        buffer: "buffer",
      },
    },
    server: {
      port: Number(process.env.VITE_REACT_APP_GAME_CLIENT_PORT),
      https: httpsConfig,
      allowedHosts: [".localhost", "game-client"],
    },
    preview: {
      port: Number(process.env.VITE_REACT_APP_GAME_CLIENT_PORT),
      https: httpsConfig,
      allowedHosts: [".localhost", "game-client"],
    },
  });
};
