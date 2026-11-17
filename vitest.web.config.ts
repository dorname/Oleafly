import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { WEB_ALIASES } from "./vite.web.config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: WEB_ALIASES },
  test: {
    root: path.resolve(__dirname),
    environment: "jsdom",
    include: ["web/src/**/*.test.ts", "web/src/**/*.test.tsx", "web/dev/**/*.test.ts"],
    setupFiles: ["./web/vitest.setup.ts"],
    // OpenLogos 运行时覆盖：与主实例同构的 json reporter，产出独立原始文件。
    reporters: ["default", "json"],
    outputFile: { json: "logos/resources/verify/.raw/vitest-web.json" },
  },
});
