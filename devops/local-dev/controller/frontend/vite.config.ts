import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd()));

  return defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      port: Number(process.env.VITE_REACT_APP_CONTROLLER_FRONTEND_PORT),
      https: {
        key: process.env.VITE_REACT_APP_SSL_KEY_FILE,
        cert: process.env.VITE_REACT_APP_SSL_CRT_FILE,
      },
      hmr: {
        // Disable HMR when accessed via external domain to prevent WebSocket errors
        // HMR only works properly when accessing via localhost
        clientPort: Number(process.env.VITE_REACT_APP_CONTROLLER_FRONTEND_PORT),
      },
    },
  })
};
