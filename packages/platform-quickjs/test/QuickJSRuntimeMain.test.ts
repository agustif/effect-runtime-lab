import { afterEach, describe, it } from "vitest"
import * as ConformanceRuntimeMain from "@effect-experimental/runtime-conformance/RuntimeMainContract"
import * as QuickJSRuntimeMain from "../src/QuickJSRuntimeMain.ts"

const originalProcess = globalThis.process

const restoreProcess = () => {
  globalThis.process = originalProcess
}

afterEach(() => {
  restoreProcess()
})

describe("QuickJSRuntimeMain", () => {
  it("matches the shared runtime-main contract", async () => {
    await ConformanceRuntimeMain.verifyBasicRuntimeMain(() => {
      const listeners = new Map<string, Set<() => void>>()
      const exitCodes: Array<number> = []
      const registrations: Array<{ readonly op: "add" | "remove"; readonly signal: string }> = []

      globalThis.process = {
        on(signal: string, listener: () => void) {
          registrations.push({ op: "add", signal })
          const current = listeners.get(signal) ?? new Set<() => void>()
          current.add(listener)
          listeners.set(signal, current)
        },
        removeListener(signal: string, listener: () => void) {
          registrations.push({ op: "remove", signal })
          listeners.get(signal)?.delete(listener)
        },
        exit(code: number) {
          exitCodes.push(code)
        }
      } as typeof process

      return {
        exitCodes,
        registrations,
        run(effect) {
          QuickJSRuntimeMain.runMain(effect, { disableErrorReporting: true })
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
