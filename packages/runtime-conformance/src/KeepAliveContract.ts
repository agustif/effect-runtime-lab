import * as Effect from "effect/Effect"

export interface KeepAliveHarness {
  run(effect: Effect.Effect<unknown, unknown>): void
}

export const verifyKeepAliveRuntimeMain = async (
  makeHarness: () => KeepAliveHarness
) => {
  const originalSetInterval = globalThis.setInterval
  const originalClearInterval = globalThis.clearInterval
  const running = {} as ReturnType<typeof globalThis.setInterval>

  try {
    let started = 0
    let stopped = 0
    let stoppedHandle: ReturnType<typeof globalThis.setInterval> | undefined

    globalThis.setInterval = ((() => {
      started++
      return running
    }) as unknown) as typeof globalThis.setInterval
    globalThis.clearInterval = ((handle: ReturnType<typeof globalThis.setInterval>) => {
      stopped++
      stoppedHandle = handle
    }) as typeof globalThis.clearInterval

    makeHarness().run(Effect.void)
    await new Promise((resolve) => setTimeout(resolve, 0))

    if (started !== 1 || stopped !== 1 || stoppedHandle !== running) {
      throw new Error(`keep-alive contract failed: started=${started} stopped=${stopped}`)
    }

    let attempts = 0
    globalThis.setInterval = (() => {
      attempts++
      throw new Error("blocked")
    }) as typeof globalThis.setInterval
    globalThis.clearInterval = (() => {
      throw new Error("blocked")
    }) as typeof globalThis.clearInterval

    makeHarness().run(Effect.void)
    await new Promise((resolve) => setTimeout(resolve, 0))

    if (attempts !== 1) {
      throw new Error(`keep-alive blocked contract failed: attempts=${attempts}`)
    }
  } finally {
    globalThis.setInterval = originalSetInterval
    globalThis.clearInterval = originalClearInterval
  }
}
