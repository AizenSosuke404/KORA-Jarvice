import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    // En local, le backend tourne sur le port 3000 (cd backend && npm run dev)
    proxy: { "/api": "http://localhost:3000", "/health": "http://localhost:3000" },
  },
});
