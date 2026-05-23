import { describe, expect, it } from "vitest";

describe("platform-cloudflare", () => {
  it("exports the expected Cloudflare-facing modules", async () => {
    const index = await import("../src/index.ts");
    expect(Object.keys(index).sort()).toEqual([
      "CloudflareContext",
      "CloudflareDurableObject",
      "CloudflareEntrypoint",
      "CloudflareHandler",
      "CloudflareKv",
      "CloudflareRpc",
      "CloudflareServices",
      "CloudflareWorkflow",
    ]);
  });

  it("exposes the unstable tmp filesystem bridge", async () => {
    const mod = await import("../src/unstable/CloudflareTmpFileSystem.ts");
    expect(typeof mod.make).toBe("function");
  });
});
