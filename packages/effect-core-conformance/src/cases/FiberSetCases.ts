import { Deferred, Effect, Exit, Fiber, FiberSet, Ref, Scope } from "effect"
import * as Cause from "effect/Cause"
import * as Option from "effect/Option"
import { TestClock } from "effect/testing"

export const interruptsFibersCase = () =>
  Effect.gen(function* () {
    const ref = yield* Ref.make(0)
    yield* Effect.scoped(
      Effect.gen(function* () {
        const set = yield* FiberSet.make()
        yield* Effect.onInterrupt(
          Effect.never,
          () => Ref.update(ref, (n) => n + 1)
        ).pipe(
          FiberSet.run(set),
          Effect.repeat({ times: 9 })
        )
        yield* Effect.yieldNow
      })
    )
    if ((yield* Ref.get(ref)) !== 10) {
      throw new Error("FiberSet interrupt cleanup count mismatch")
    }
  })

export const awaitEmptyCase = () =>
  Effect.gen(function* () {
    const set = yield* FiberSet.make()
    yield* FiberSet.run(set, Effect.sleep(1000))
    yield* FiberSet.run(set, Effect.sleep(1000))
    yield* FiberSet.run(set, Effect.sleep(1000))
    yield* FiberSet.run(set, Effect.sleep(1000))

    const fiber = yield* Effect.forkChild(FiberSet.awaitEmpty(set))
    yield* TestClock.adjust(500)
    if (fiber.pollUnsafe() !== undefined) {
      throw new Error("FiberSet.awaitEmpty completed too early")
    }
    yield* TestClock.adjust(500)
    if (fiber.pollUnsafe() === undefined) {
      throw new Error("FiberSet.awaitEmpty did not complete")
    }
  }).pipe(Effect.provide(TestClock.layer()))

export const runtimeCase = () =>
  Effect.gen(function* () {
    const ref = yield* Ref.make(0)
    yield* Effect.scoped(
      Effect.gen(function* () {
        const set = yield* FiberSet.make()
        const run = yield* FiberSet.runtime(set)<never>()
        for (let index = 0; index < 10; index++) {
          run(
            Effect.onInterrupt(
              Effect.never,
              () => Ref.update(ref, (n) => n + 1)
            )
          )
        }
        yield* Effect.yieldNow
      })
    )
    if ((yield* Ref.get(ref)) !== 10) {
      throw new Error("FiberSet.runtime cleanup count mismatch")
    }
  })

export const joinCase = () =>
  Effect.gen(function* () {
    const set = yield* FiberSet.make()
    FiberSet.addUnsafe(set, Effect.runFork(Effect.void))
    FiberSet.addUnsafe(set, Effect.runFork(Effect.void))
    FiberSet.addUnsafe(set, Effect.runFork(Effect.fail("fail")))
    const result = yield* FiberSet.join(set).pipe(Effect.flip)
    if (result !== "fail") {
      throw new Error(`FiberSet.join contract failed: ${String(result)}`)
    }
  })

export const sizeCase = () =>
  Effect.gen(function* () {
    const scope = yield* Scope.make()
    const set = yield* FiberSet.make().pipe(Scope.provide(scope))
    FiberSet.addUnsafe(set, Effect.runFork(Effect.never))
    FiberSet.addUnsafe(set, Effect.runFork(Effect.never))
    if ((yield* FiberSet.size(set)) !== 2) {
      throw new Error("FiberSet.size pre-close contract failed")
    }
    yield* Scope.close(scope, Exit.void)
    if ((yield* FiberSet.size(set)) !== 0) {
      throw new Error("FiberSet.size post-close contract failed")
    }
  })

export const sizeDropsAfterCompletionCase = () =>
  Effect.gen(function* () {
    const set = yield* FiberSet.make()
    const fiber = yield* FiberSet.run(set, Effect.succeed("done"))
    yield* Fiber.await(fiber)
    yield* Effect.yieldNow
    if ((yield* FiberSet.size(set)) !== 0) {
      throw new Error("FiberSet.size did not drop after completion")
    }
  })

export const propagateInterruptionFalseCase = () =>
  Effect.gen(function* () {
    const set = yield* FiberSet.make()
    const fiber = yield* FiberSet.run(set, Effect.never, {
      propagateInterruption: false
    })
    yield* Effect.yieldNow
    yield* Fiber.interrupt(fiber)
    if (yield* Deferred.isDone(set.deferred)) {
      throw new Error("FiberSet propagateInterruption=false contract failed")
    }
  })

export const joinCompletesOnFailureWithRunningFibersCase = () =>
  Effect.gen(function* () {
    const set = yield* FiberSet.make()
    yield* FiberSet.run(set, Effect.sleep("1 second").pipe(Effect.andThen(Effect.fail("boom"))))
    yield* FiberSet.run(set, Effect.never)

    const joinFiber = yield* Effect.forkChild(FiberSet.join(set))
    yield* TestClock.adjust("500 millis")
    if (joinFiber.pollUnsafe() !== undefined) {
      throw new Error("FiberSet.join completed before failure")
    }
    yield* TestClock.adjust("600 millis")
    const exit = joinFiber.pollUnsafe()
    if (exit === undefined || !Exit.isFailure(exit)) {
      throw new Error(`FiberSet.join did not fail after error: ${JSON.stringify(exit)}`)
    }
    const failure = Cause.findErrorOption(exit.cause)
    if (Option.isNone(failure) || failure.value !== "boom") {
      throw new Error(`FiberSet.join failure mismatch: ${JSON.stringify(failure)}`)
    }
  }).pipe(Effect.provide(TestClock.layer()))

export const propagateInterruptionTrueCase = () =>
  Effect.gen(function* () {
    const set = yield* FiberSet.make()
    const fiber = yield* FiberSet.run(set, Effect.never, {
      propagateInterruption: true
    })
    yield* Effect.yieldNow
    yield* Fiber.interrupt(fiber)
    const exit = yield* FiberSet.join(set).pipe(Effect.exit)
    if (!Exit.hasInterrupts(exit)) {
      throw new Error(`FiberSet propagateInterruption=true contract failed: ${JSON.stringify(exit)}`)
    }
  })
