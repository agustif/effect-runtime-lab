/**
 * @since 1.0.0
 */
import * as Runtime from "effect/Runtime"

/**
 * @since 1.0.0
 * @category Run main
 */
export const runMain = Runtime.makeRunMain(({ fiber, teardown }) => {
  const proc = (globalThis as typeof globalThis & { process?: { on?: Function; removeListener?: Function; exit?: (code: number) => void } }).process
  let receivedSignal = false

  const onSignal = () => {
    receivedSignal = true
    proc?.removeListener?.("SIGINT", onSignal)
    proc?.removeListener?.("SIGTERM", onSignal)
    fiber.interruptUnsafe(fiber.id)
  }

  proc?.on?.("SIGINT", onSignal)
  proc?.on?.("SIGTERM", onSignal)

  fiber.addObserver((exit) => {
    if (!receivedSignal) {
      proc?.removeListener?.("SIGINT", onSignal)
      proc?.removeListener?.("SIGTERM", onSignal)
    }
    teardown(exit, (code) => {
      if (receivedSignal || code !== 0) {
        proc?.exit?.(code)
      }
    })
  })
})
