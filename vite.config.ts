import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from kevisc.github.io/empiria/ in production, root in dev.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/empiria/" : "/",
  plugins: [react()],
  server: { host: true },
}));
