import { execFileSync, spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as Effect from "effect/Effect";

export const fileSizeBytes = (path: string): number | null =>
  existsSync(path) ? statSync(path).size : null;

export const macDependencies = (path: string): Array<string> => {
  try {
    return execFileSync("otool", ["-L", path], { encoding: "utf8" })
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const linuxDependencies = (path: string): Array<string> => {
  try {
    return execFileSync("ldd", [path], { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const windowsDependencies = (path: string): Array<string> => {
  try {
    return execFileSync("dumpbin", ["/DEPENDENTS", path], { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const platformDependencies = (path: string): { deps: Array<string>; source: string } => {
  if (process.platform === "darwin") {
    return { deps: macDependencies(path), source: "otool" };
  }
  if (process.platform === "linux") {
    return { deps: linuxDependencies(path), source: "ldd" };
  }
  if (process.platform === "win32") {
    return { deps: windowsDependencies(path), source: "dumpbin" };
  }
  return { deps: [], source: "unknown" };
};

export interface CommandMeasurement {
  readonly wallTimeMs: number;
  readonly maxResidentSetKb: number | null;
  readonly rssSource: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

const parseMacMaxResidentSetKb = (stderr: string): number | null => {
  const match = stderr.match(/^\s*(\d+)\s+maximum resident set size/m);
  return match ? Math.round(Number(match[1]) / 1024) : null;
};

const parseLinuxMaxResidentSetKb = (stderr: string): number | null => {
  const match = stderr.match(/Maximum resident set size \(kbytes\):\s*(\d+)/m);
  return match ? Number(match[1]) : null;
};

export const measureCommandEffect = (
  command: string,
  args: ReadonlyArray<string>,
  options?: SpawnSyncOptions,
) =>
  Effect.sync((): CommandMeasurement => {
    const startedAt = process.hrtime.bigint();

    if (process.platform === "darwin") {
      const result = spawnSync("/usr/bin/time", ["-l", command, ...args], {
        encoding: "utf8",
        ...options,
      });
      const stdout = String(result.stdout ?? "");
      const stderr = String(result.stderr ?? "");
      const wallTimeMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      return {
        wallTimeMs,
        maxResidentSetKb: parseMacMaxResidentSetKb(stderr),
        rssSource: "time -l",
        exitCode: result.status ?? 1,
        stdout,
        stderr,
      };
    }

    if (process.platform === "linux") {
      const result = spawnSync("/usr/bin/time", ["-v", command, ...args], {
        encoding: "utf8",
        ...options,
      });
      if (!result.error) {
        const stdout = String(result.stdout ?? "");
        const stderr = String(result.stderr ?? "");
        return {
          wallTimeMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
          maxResidentSetKb: parseLinuxMaxResidentSetKb(stderr),
          rssSource: "time -v",
          exitCode: result.status ?? 1,
          stdout,
          stderr,
        };
      }
    }

    const result = spawnSync(command, [...args], {
      encoding: "utf8",
      ...options,
    });
    const stdout = String(result.stdout ?? "");
    const stderr = String(result.stderr ?? "");

    return {
      wallTimeMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      maxResidentSetKb: null,
      rssSource: "unknown",
      exitCode: result.status ?? 1,
      stdout,
      stderr,
    };
  });

export const measureCommand = (
  command: string,
  args: ReadonlyArray<string>,
  options?: SpawnSyncOptions,
): CommandMeasurement => Effect.runSync(measureCommandEffect(command, args, options));

export const withTemporaryJavaScriptFile = <A>(source: string, f: (path: string) => A): A => {
  const directory = mkdtempSync(join(tmpdir(), "effect-runtime-bench-"));
  const file = join(directory, "entry.js");
  writeFileSync(file, source);

  try {
    return f(file);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};
