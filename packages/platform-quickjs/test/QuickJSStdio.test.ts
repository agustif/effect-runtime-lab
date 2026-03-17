import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as ConformanceStdio from "@effect-experimental/runtime-conformance/StdioContract"
import * as QuickJSStdio from "../src/QuickJSStdio.ts"

const stdout = vi.fn<(value: string) => void>()
const stderr = vi.fn<(value: string) => void>()
let stdinReads = 0
const originalStd = (globalThis as typeof globalThis & { std?: unknown }).std
const originalOs = (globalThis as typeof globalThis & { os?: unknown }).os
const originalProcess = globalThis.process

const restoreGlobals = () => {
  ;(globalThis as typeof globalThis & { std?: unknown }).std = originalStd
  ;(globalThis as typeof globalThis & { os?: unknown }).os = originalOs
  globalThis.process = originalProcess
}

beforeEach(() => {
  stdout.mockReset()
  stderr.mockReset()
  stdinReads = 0
  ;(globalThis as typeof globalThis & { std?: unknown; os?: unknown }).std = {
    out: { puts: stdout },
    err: { puts: stderr }
  }
  globalThis.process = {
    argv: ["host", "script.js", "a", "b"]
  } as typeof process
  ;(globalThis as typeof globalThis & { os?: unknown }).os = {
    read: (_fd: number, buffer: ArrayBuffer) => {
      if (stdinReads > 0) {
        return 0
      }
      stdinReads++
      const chunk = new TextEncoder().encode("input")
      new Uint8Array(buffer).set(chunk)
      return chunk.byteLength
    }
  }
})

afterEach(() => {
  restoreGlobals()
})

describe("QuickJSStdio", () => {
  it("satisfies the shared stdio contract against the QuickJS host bindings", async () => {
    await ConformanceStdio.verifyBasicStdioLayer(QuickJSStdio.layer, {
      expectedArgs: ["a", "b"],
      stdoutChunk: "hello stdout",
      stderrChunk: "hello stderr",
      expectedStdinText: ["input"]
    })

    expect(stdout).toHaveBeenCalledWith("hello stdout")
    expect(stderr).toHaveBeenCalledWith("hello stderr")
  })
})
