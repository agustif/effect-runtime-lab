/**
 * @since 1.0.0
 */
import * as Runtime from "effect/Runtime"

type TxikiGlobal = {
  readonly addSignalListener?: (signal: string, listener: () => void) => void
  readonly removeSignalListener?: (signal: string, listener: () => void) => void
  readonly exit?: (code?: number) => void
}

/**
 * @since 1.0.0
 * @category Run main
 */
export const runMain = Runtime.makeRunMain(({ fiber, teardown }) => {
  const tjs = (globalThis as typeof globalThis & { tjs?: TxikiGlobal }).tjs
  let receivedSignal = false
  const onSignal = () => {
    receivedSignal = true
    tjs?.removeSignalListener?.("SIGINT", onSignal)
    tjs?.removeSignalListener?.("SIGTERM", onSignal)
    fiber.interruptUnsafe(fiber.id)
  }

  tjs?.addSignalListener?.("SIGINT", onSignal)
  tjs?.addSignalListener?.("SIGTERM", onSignal)

  fiber.addObserver((exit) => {
    if (!receivedSignal) {
      tjs?.removeSignalListener?.("SIGINT", onSignal)
      tjs?.removeSignalListener?.("SIGTERM", onSignal)
    }
    teardown(exit, (code) => {
      if (receivedSignal || code !== 0) {
        tjs?.exit?.(code)
      }
    })
  })
})
