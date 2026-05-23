#!/usr/bin/env bun

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
const quickjsDir = join(repoRoot, "vendor", "quickjs-ng");
const nativeDir = join(packageRoot, "native");
const outputDir = join(packageRoot, "bin");
const buildDir = join(quickjsDir, "build");
const hostBinary = join(outputDir, "effect-quickjs-host");
const polyfillsJs = join(packageRoot, "src", "prod", "polyfills.js");
const polyfillsC = join(outputDir, "polyfills.c");
const hostC = join(packageRoot, "src", "prod", "main.c");
const qjsc = join(buildDir, "qjsc");

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

rmSync(buildDir, { force: true, recursive: true });
execSync("cmake -B build -DCMAKE_BUILD_TYPE=Release", {
  cwd: quickjsDir,
  stdio: "inherit",
});
execSync("cmake --build build -j 4", {
  cwd: quickjsDir,
  stdio: "inherit",
});

execSync(`${qjsc} -o ${polyfillsC} -N qjsc_polyfills ${polyfillsJs}`, {
  stdio: "inherit",
});

const compile = [
  "clang",
  "-O3",
  "-DENABLE_HTTP",
  "-DNDEBUG",
  "-o",
  hostBinary,
  hostC,
  polyfillsC,
  join(quickjsDir, "quickjs-libc.c"),
  join(nativeDir, "quickjs-libc-extra.c"),
  join(nativeDir, "quickjs-http.c"),
  "-I" + quickjsDir,
  "-I" + nativeDir,
  "-L" + buildDir,
  "-lqjs",
  "-lm",
  "-ldl",
  "-lpthread",
  "-lcurl",
].join(" ");

execSync(compile, {
  stdio: "inherit",
});

try {
  execSync(`strip ${hostBinary}`, { stdio: "inherit" });
} catch {}
