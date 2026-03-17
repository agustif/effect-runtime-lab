import { beforeEach, describe, expect, it, vi } from "vitest"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

const stdout = vi.fn<(value: string) => void>()
const stderr = vi.fn<(value: string) => void>()

beforeEach(() => {
  stdout.mockReset()
  stderr.mockReset()
  ;(globalThis as typeof globalThis & { std?: unknown }).std = {
    out: { puts: stdout },
    err: { puts: stderr }
  }
})

describe("QuickJSConsole", () => {
  it("routes Console.log to stdout", async () => {
    const mod = await import("../src/QuickJSConsole.ts")
    await Effect.runPromise(Console.log("hello").pipe(Effect.provide(mod.layer)))
    expect(stdout).toHaveBeenCalled()
    expect(stderr).not.toHaveBeenCalled()
  })

  it("routes Console.error to stderr", async () => {
    const mod = await import("../src/QuickJSConsole.ts")
    await Effect.runPromise(Console.error("boom").pipe(Effect.provide(mod.layer)))
    expect(stderr).toHaveBeenCalled()
  })
})
