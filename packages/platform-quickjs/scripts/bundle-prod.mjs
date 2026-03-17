#!/usr/bin/env bun

import { build } from "esbuild"
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, "..")
const testDir = join(packageRoot, "test", "prod")
const outDir = join(packageRoot, "dist-prod")
const fixtureBaseUrl = process.env.FIXTURE_BASE_URL ?? "http://127.0.0.1:3456"

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

const entries = ["runtime.prod.ts", "filesystem.prod.ts", "path.prod.ts", "httpclient.prod.ts", "watch.prod.ts"]

for (const entry of entries) {
  await build({
    entryPoints: [join(testDir, entry)],
    outfile: join(outDir, entry.replace(/\.ts$/, ".js")),
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["qjs:std", "qjs:os", "qjs:http"],
    define: {
      __FIXTURE_BASE_URL__: JSON.stringify(fixtureBaseUrl)
    }
  })
}
