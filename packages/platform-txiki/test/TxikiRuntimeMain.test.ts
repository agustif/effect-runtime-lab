import { afterEach, describe, it } from "vitest"
import * as ConformanceRuntimeMain from "@effect-experimental/runtime-conformance/RuntimeMainContract"
import * as TxikiRuntimeMain from "../src/TxikiRuntimeMain.ts"

const originalTjs = (globalThis as typeof globalThis & { tjs?: unknown }).tjs

const restoreTxiki = () => {
  ;(globalThis as typeof globalThis & { tjs?: unknown }).tjs = originalTjs
}

afterEach(() => {
  restoreTxiki()
})

describe("TxikiRuntimeMain", () => {
  it("matches the shared runtime-main contract", async () => {
    await ConformanceRuntimeMain.verifyBasicRuntimeMain(() => {
      const listeners = new Map<string, Set<() => void>>()
      const exitCodes: Array<number> = []
      const registrations: Array<{ readonly op: "add" | "remove"; readonly signal: string }> = []

      ;(globalThis as typeof globalThis & { tjs?: unknown }).tjs = {
        addSignalListener(signal: string, listener: () => void) {
          registrations.push({ op: "add", signal })
          const current = listeners.get(signal) ?? new Set<() => void>()
          current.add(listener)
          listeners.set(signal, current)
        },
        removeSignalListener(signal: string, listener: () => void) {
          registrations.push({ op: "remove", signal })
          listeners.get(signal)?.delete(listener)
        },
        exit(code = 0) {
          exitCodes.push(code)
        }
      }

      return {
        exitCodes,
        registrations,
        run(effect) {
          TxikiRuntimeMain.runMain(effect, { disableErrorReporting: true })
        },
        emit(signal) {
          for (const listener of listeners.get(signal) ?? []) {
            listener()
          }
        }
      }
    })
  })
})
