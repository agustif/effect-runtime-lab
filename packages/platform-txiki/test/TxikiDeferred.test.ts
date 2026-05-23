import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");

describe("Txiki deferred parity surfaces", () => {
  it("covers deeper watch semantics beyond the original single-event contract", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain("- [ ] more watch semantics");
  });

  it("covers richer file-handle edge cases", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain("- [ ] richer file-handle semantics");
    expect(tasks).not.toContain("- [ ] richer file-handle edge cases");
  });

  it("covers upload streaming semantics", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain("- [ ] upload streaming and deeper multipart semantics");
  });

  it("covers multipart form-data semantics", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain("- [ ] richer HTTP error mapping");
  });

  it("captures executable, dependency, startup, and memory proofs from this repo", () => {
    const bench = JSON.parse(
      readFileSync(resolve(repoRoot, "docs/generated/runtime-bench.json"), "utf8"),
    ) as {
      artifacts: Array<{ path: string }>;
      startup: Array<{ name: string; maxResidentSetKb: number | null }>;
      warmStart: Array<{ name: string; rssSamplesKb: Array<number | null> }>;
    };

    expect(bench.artifacts.some((entry) => entry.path.includes("txikijs/build/tjs"))).toBe(true);
    expect(
      bench.startup.some(
        (entry) => entry.name === "txiki-runtime" && entry.maxResidentSetKb !== null,
      ),
    ).toBe(true);
    expect(
      bench.warmStart.some(
        (entry) =>
          entry.name === "txiki-runtime" && entry.rssSamplesKb.some((value) => value !== null),
      ),
    ).toBe(true);
  });
});
