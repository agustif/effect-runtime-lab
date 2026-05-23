import { defineConfig } from "vitest/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: join(__dirname, "../../.vite-temp/platform-quickjs"),
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
