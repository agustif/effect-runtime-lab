import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as MicroQuickJSRuntime from "../src/MicroQuickJSRuntime.ts"

describe("MicroQuickJSRuntime", () => {
  it("evaluates basic guest code", async () => {
    const runtime = await MicroQuickJSRuntime.create()
    try {
      await expect(runtime.eval("1 + 1")).resolves.toBe(2)
    } finally {
      runtime.dispose()
    }
  })

  it("exposes synchronous host objects", async () => {
    const runtime = await MicroQuickJSRuntime.create()
    try {
      await runtime.expose("Math2", {
        add: (a: number, b: number) => a + b
      })
      await expect(runtime.eval("Math2.add(3, 4)")).resolves.toBe(7)
    } finally {
      runtime.dispose()
    }
  })

  it("exposes asynchronous host objects as synchronous guest calls", async () => {
    const runtime = await MicroQuickJSRuntime.create()
    try {
      await runtime.expose("Std", {
        fetchValue: async () => ({ value: "async-result" })
      })
      await expect(runtime.eval("Std.fetchValue().value")).resolves.toBe("async-result")
    } finally {
      runtime.dispose()
    }
  })

  it("interrupts runaway guest code with fuel", async () => {
    const runtime = await MicroQuickJSRuntime.create()
    try {
      await expect(runtime.eval("while(true){}", { fuel: 100_000 })).rejects.toThrow(/interrupted/i)
    } finally {
      runtime.dispose()
    }
  })

  it("provides a scoped Effect layer", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const runtime = yield* MicroQuickJSRuntime.MicroQuickJSEngine
        return yield* MicroQuickJSRuntime.evalEffect(runtime, "2 + 3")
      }).pipe(
        Effect.provide(MicroQuickJSRuntime.layer())
      )
    )

    expect(result).toBe(5)
  })
})
