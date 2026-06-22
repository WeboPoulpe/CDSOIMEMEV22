import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    // Integration tests hit a shared remote DB and take a row lock; running test
    // files serially avoids cross-file contention/flakiness on that connection.
    fileParallelism: false,
    env: (() => {
      // Load .env for integration tests that hit the real DB
      const fs = require("fs");
      const envPath = path.resolve(__dirname, ".env");
      if (!fs.existsSync(envPath)) return {};
      const content = fs.readFileSync(envPath, "utf-8");
      return Object.fromEntries(
        content
          .split("\n")
          .filter((l: string) => l && !l.startsWith("#") && l.includes("="))
          .map((l: string) => {
            const idx = l.indexOf("=");
            const key = l.slice(0, idx).trim();
            const val = l.slice(idx + 1).trim().replace(/^"|"$/g, "");
            return [key, val];
          })
      );
    })(),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
