import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import * as Effect from "effect/Effect";
import {
  fileSizeBytes,
  measureCommand,
  platformDependencies,
  withTemporaryJavaScriptFile,
  type CommandMeasurement,
} from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

export interface ArtifactRecord {
  readonly path: string;
  readonly size: number | null;
  readonly deps: Array<string>;
  readonly depsSource: string;
  readonly platform: PlatformInfo;
}

export interface StartupRecord {
  readonly name: string;
  readonly wallTimeMs: number;
  readonly maxResidentSetKb: number | null;
  readonly rssSource: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface WarmStartRecord {
  readonly name: string;
  readonly iterations: number;
  readonly samplesMs: Array<number>;
  readonly rssSamplesKb: Array<number | null>;
  readonly rssSource: string;
}

export interface PlatformInfo {
  readonly os: string;
  readonly arch: string;
  readonly node: string;
}

export const artifactCandidates = [
  resolve(repoRoot, "packages/platform-quickjs/bin/effect-quickjs-host"),
  resolve(repoRoot, ".tmp-runtime-evals/txikijs/build/tjs"),
  resolve(repoRoot, ".tmp-runtime-evals/txikijs/hello-compiled"),
];

export const startupCandidates: Array<
  | {
      readonly name: string;
      readonly mode: "script";
      readonly command: string;
      readonly args?: ReadonlyArray<string>;
    }
  | {
      readonly name: string;
      readonly mode: "standalone";
      readonly command: string;
    }
> = [
  {
    name: "quickjs-host",
    mode: "script",
    command: resolve(repoRoot, "packages/platform-quickjs/bin/effect-quickjs-host"),
  },
  {
    name: "txiki-runtime",
    mode: "script",
    command: resolve(repoRoot, ".tmp-runtime-evals/txikijs/build/tjs"),
    args: ["run"],
  },
  {
    name: "txiki-compiled",
    mode: "standalone",
    command: resolve(repoRoot, ".tmp-runtime-evals/txikijs/hello-compiled"),
  },
  { name: "node", mode: "script", command: "node" },
  { name: "deno", mode: "script", command: "deno", args: ["run"] },
  { name: "bun", mode: "script", command: "bun" },
];

const platformInfo = (): PlatformInfo => ({
  os: process.platform,
  arch: process.arch,
  node: process.version,
});

const commandExists = (command: string): boolean => {
  // If it's a full path, check if file exists
  if (command.includes("/") || command.includes("\\")) {
    return existsSync(command);
  }
  // Otherwise check if command is in PATH
  try {
    const checkCmd = process.platform === "win32" ? "where" : "which";
    execFileSync(checkCmd, [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const measureCandidate = (candidate: (typeof startupCandidates)[number]): CommandMeasurement => {
  if (candidate.mode === "standalone") {
    return measureCommand(candidate.command, []);
  }
  return withTemporaryJavaScriptFile("globalThis.process?.stdout?.write?.('ok\\n')", (scriptPath) =>
    measureCommand(candidate.command, [...(candidate.args ?? []), scriptPath], { cwd: repoRoot }),
  );
};

export const collectArtifacts = (): Array<ArtifactRecord> =>
  artifactCandidates
    .filter((path) => existsSync(path))
    .map((path) => {
      const dependencies = platformDependencies(path);
      return {
        path,
        size: fileSizeBytes(path),
        deps: dependencies.deps,
        depsSource: dependencies.source,
        platform: platformInfo(),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

export const collectStartup = (): Array<StartupRecord> => {
  const out: Array<StartupRecord> = [];
  for (const candidate of startupCandidates) {
    if (!commandExists(candidate.command)) continue;
    try {
      out.push({ name: candidate.name, ...measureCandidate(candidate) });
    } catch (error) {
      console.warn(`Failed to measure ${candidate.name}:`, error);
    }
  }
  return out.sort((a, b) => a.wallTimeMs - b.wallTimeMs);
};

export const collectWarmStart = (iterations = 5): Array<WarmStartRecord> => {
  const out: Array<WarmStartRecord> = [];
  for (const candidate of startupCandidates) {
    if (!commandExists(candidate.command)) continue;
    try {
      const measurements = Effect.runSync(
        Effect.forEach(
          Array.from({ length: iterations }, () => null),
          () => Effect.sync(() => measureCandidate(candidate)),
        ),
      );
      const samplesMs = measurements.map((measurement) => measurement.wallTimeMs);
      const rssSamplesKb = measurements.map((measurement) => measurement.maxResidentSetKb);
      const rssSource =
        measurements.find((measurement) => measurement.rssSource !== "unknown")?.rssSource ??
        "unknown";
      out.push({
        name: candidate.name,
        iterations,
        samplesMs,
        rssSamplesKb,
        rssSource,
      });
    } catch (error) {
      console.warn(`Failed to measure warm start for ${candidate.name}:`, error);
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
};

export const writeRuntimeBenchSnapshot = (
  outputPath = resolve(repoRoot, "docs/generated/runtime-bench.json"),
) => {
  mkdirSync(dirname(outputPath), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    platform: platformInfo(),
    artifacts: collectArtifacts(),
    startup: collectStartup(),
    warmStart: collectWarmStart(),
  };
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
};
