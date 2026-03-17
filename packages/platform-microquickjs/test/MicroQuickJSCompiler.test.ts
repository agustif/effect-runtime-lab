import { describe, expect, it } from "vitest"
import * as MicroQuickJSCompiler from "../src/MicroQuickJSCompiler.ts"
import * as MicroQuickJSRuntime from "../src/MicroQuickJSRuntime.ts"

describe("MicroQuickJSCompiler", () => {
  it("compiles modern JavaScript into MicroQuickJS-compatible code", async () => {
    const runtime = await MicroQuickJSRuntime.create()
    try {
      const compiled = MicroQuickJSCompiler.compile(`
        const add = (a, b) => a + b;
        add(3, 4);
      `)
      await expect(runtime.eval(compiled)).resolves.toBe(7)
    } finally {
      runtime.dispose()
    }
  })
})
