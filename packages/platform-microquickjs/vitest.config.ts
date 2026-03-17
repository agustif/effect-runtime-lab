import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: "node"
  },
  cacheDir: join(__dirname, "../../.vite-temp/platform-microquickjs")
})
