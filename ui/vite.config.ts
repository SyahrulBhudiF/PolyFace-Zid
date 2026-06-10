import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],

  server: {
    host: "0.0.0.0",
    port: 5173,

    allowedHosts: [
      "bore.pub",
    ],

    proxy: {
      "/auth": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/history": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/predict": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});