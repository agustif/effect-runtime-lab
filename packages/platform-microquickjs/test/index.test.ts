import { describe, expect, it } from "vitest"

describe("platform-microquickjs", () => {
  it("exports the expected modules", async () => {
    const index = await import("../src/index.ts")
    expect(Object.keys(index).sort()).toEqual([
      "MicroQuickJSCompiler",
      "MicroQuickJSRuntime"
    ])
  })
})
