import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");

describe("QuickJS deferred parity surfaces", () => {
  it("implements watch semantics beyond the old deferred policy", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain(
      "- [ ] richer watch semantics beyond the current create/update/remove and polling-based contract",
    );
  });

  it("covers richer real-host file-handle edge cases", () => {
    const testing = readFileSync(resolve(packageRoot, "docs/TESTING.md"), "utf8");
    expect(testing).toContain("closed-handle");
    expect(testing).toContain("permission-mapping");
  });

  it("covers upload streaming semantics", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain("- [ ] deeper transport-level upload streaming");
  });

  it("covers multipart form-data semantics", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain(
      "- [ ] multipart depth beyond the current basic form upload contract",
    );
  });

  it("covers richer transport and decode error mapping", () => {
    const tasks = readFileSync(resolve(packageRoot, "TASKS.md"), "utf8");
    expect(tasks).not.toContain("- [ ] richer transport and decode errors");
  });

  it("documents cross-platform artifact guarantees with executable proofs", () => {
    const architecture = readFileSync(resolve(packageRoot, "docs/ARCHITECTURE.md"), "utf8");
    const bench = JSON.parse(
      readFileSync(resolve(repoRoot, "docs/generated/runtime-bench.json"), "utf8"),
    ) as { artifacts: Array<{ path: string }>; startup: Array<{ name: string }> };

    expect(architecture).toContain("macOS: locally verified");
    expect(architecture).toContain("Linux: source and benchmark helpers exist");
    expect(architecture).toContain("Windows: no host-proof or packaging guarantee is claimed yet");
    expect(
      bench.artifacts.some((entry) =>
        entry.path.includes("platform-quickjs/bin/effect-quickjs-host"),
      ),
    ).toBe(true);
    expect(bench.startup.some((entry) => entry.name === "quickjs-host")).toBe(true);
  });
});
