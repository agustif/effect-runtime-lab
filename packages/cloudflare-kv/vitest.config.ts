import { cloudflarePool, cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const poolOptions = {
  miniflare: {
    kvNamespaces: ["KV"],
  },
  wrangler: {
    configPath: "./wrangler.jsonc",
  },
};

export default defineConfig({
  plugins: [cloudflareTest(poolOptions)],
  test: {
    include: ["test/**/*.test.ts"],
    pool: cloudflarePool(poolOptions),
  },
});
