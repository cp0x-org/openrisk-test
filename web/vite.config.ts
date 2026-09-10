import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const base = process.env.VITE_BASE || "/";

const syncDataPlugin = (): Plugin => {
  const sync = () => {
    const src = resolve(__dirname, "../data");
    const dest = resolve(__dirname, "public/data");
    if (!existsSync(src)) return;
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  };

  return {
    name: "openrisk-sync-data",
    buildStart: sync,
    configureServer(server) {
      sync();
      server.watcher.add(resolve(__dirname, "../data"));
      server.watcher.on("change", (file) => {
        if (file.includes(`${resolve(__dirname, "../data")}`) || file.replace(/\\/g, "/").includes("/data/")) {
          sync();
        }
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), syncDataPlugin()],
  base,
});
