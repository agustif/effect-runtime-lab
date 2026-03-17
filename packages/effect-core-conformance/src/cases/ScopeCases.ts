import { Duration, Effect, Exit, Ref, Scope } from "effect"
import { TestClock } from "effect/testing"

export const parallelFinalizationCase = () =>
  Effect.gen(function* () {
    const scope = Scope.makeUnsafe("parallel")
    yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
    yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
    yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))

    const fiber = yield* Effect.forkChild(Scope.close(scope, Exit.void), { startImmediately: true })
    if (fiber.pollUnsafe() !== undefined) {
      throw new Error("scope close finished before clock advanced")
    }

    yield* TestClock.adjust(Duration.seconds(1))

    if (fiber.pollUnsafe() === undefined) {
      throw new Error("scope close did not complete after clock advance")
    }
  }).pipe(Effect.provide(TestClock.layer()))

export const sequentialFinalizersRunInReverseOrderCase = () =>
  Effect.gen(function* () {
    const scope = Scope.makeUnsafe("sequential")
    const order = yield* Ref.make<Array<number>>([])

    const addFinalizer = (value: number) =>
      Scope.addFinalizer(scope, Ref.update(order, (values) => [...values, value]))

    yield* addFinalizer(1)
    yield* addFinalizer(2)
    yield* addFinalizer(3)

    yield* Scope.close(scope, Exit.void)

    const result = yield* Ref.get(order)
    const expected = [3, 2, 1]
    if (JSON.stringify(result) !== JSON.stringify(expected)) {
      throw new Error(`scope finalizer order mismatch: ${JSON.stringify({ expected, result })}`)
    }
  })
