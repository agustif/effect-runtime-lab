import { describe, expect, it } from "vitest";

describe("platform-quickjs", () => {
  it("exports the expected modules", async () => {
    const entry = await import("../src/index.ts");
    expect(typeof entry.QuickJSConsole).toBe("object");
    expect(typeof entry.QuickJSLogger).toBe("object");
    expect(typeof entry.QuickJSFileSystem).toBe("object");
    expect(typeof entry.QuickJSPath).toBe("object");
    expect(typeof entry.QuickJSHttpClient).toBe("object");
    expect(typeof entry.QuickJSServices).toBe("object");
    expect(typeof entry.QuickJSRuntime).toBe("object");
  });
});
