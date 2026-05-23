import { describe, expect, it } from "vitest";

describe("platform-txiki", () => {
  it("exports the expected modules", async () => {
    const entry = await import("../src/index.ts");
    expect(typeof entry.TxikiConsole).toBe("object");
    expect(typeof entry.TxikiLogger).toBe("object");
    expect(typeof entry.TxikiFileSystem).toBe("object");
    expect(typeof entry.TxikiPath).toBe("object");
    expect(typeof entry.TxikiHttpClient).toBe("object");
    expect(typeof entry.TxikiRuntime).toBe("object");
    expect(typeof entry.TxikiServices).toBe("object");
  });
});
