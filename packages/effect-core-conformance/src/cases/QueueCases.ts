import { Cause, Effect, Exit, Fiber, Option, Queue, Stream } from "effect"

export const interruptAllowsDrainingCase = () =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<number>(10)
    yield* Queue.offerAll(queue, [1, 2, 3, 4, 5])

    const interrupted = yield* Queue.interrupt(queue)
    if (!interrupted) {
      throw new Error("queue interrupt returned false")
    }

    const offerResult = yield* Queue.offer(queue, 6)
    if (offerResult !== false) {
      throw new Error("queue accepted offer after interrupt")
    }

    const drained = [
      yield* Queue.take(queue),
      yield* Queue.take(queue),
      yield* Queue.take(queue),
      yield* Queue.take(queue),
      yield* Queue.take(queue)
    ]

    if (JSON.stringify(drained) !== JSON.stringify([1, 2, 3, 4, 5])) {
      throw new Error(`queue drain contract failed: ${JSON.stringify(drained)}`)
    }

    const exit = yield* Queue.take(queue).pipe(Effect.exit)
    if (!Exit.hasInterrupts(exit)) {
      throw new Error(`queue interrupt exit contract failed: ${JSON.stringify(exit)}`)
    }
  })

export const offerAllInterruptedCase = () =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<number>(2)
    const fiber = yield* Queue.offerAll(queue, [1, 2, 3, 4]).pipe(
      Effect.forkChild
    )

    yield* Effect.yieldNow
    yield* Fiber.interrupt(fiber)
    yield* Effect.yieldNow

    const first = yield* Queue.takeAll(queue)
    if (JSON.stringify(first) !== JSON.stringify([1, 2])) {
      throw new Error(`queue offerAll interruption failed: ${JSON.stringify(first)}`)
    }

    yield* Queue.offer(queue, 5)
    yield* Effect.yieldNow

    const second = yield* Queue.takeAll(queue)
    if (JSON.stringify(second) !== JSON.stringify([5])) {
      throw new Error(`queue offerAll post-interrupt drain failed: ${JSON.stringify(second)}`)
    }
  })

export const doneCompletesTakesCase = () =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<number, Cause.Done>(2)
    const fiber = yield* Queue.takeAll(queue).pipe(Effect.forkChild)
    yield* Effect.yieldNow
    yield* Queue.end(queue)
    const exit = yield* Fiber.await(fiber)
    if (JSON.stringify(exit) !== JSON.stringify(Exit.fail(Cause.Done()))) {
      throw new Error(`queue done completes takes contract failed: ${JSON.stringify(exit)}`)
    }
  })

export const endWithTakeCase = () =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<number, Cause.Done>(2)
    yield* Effect.forkChild(Queue.offerAll(queue, [1, 2]))
    yield* Effect.forkChild(Queue.offer(queue, 3))
    yield* Effect.forkChild(Queue.end(queue))
    const drained = [yield* Queue.take(queue), yield* Queue.take(queue), yield* Queue.take(queue)]
    if (JSON.stringify(drained) !== JSON.stringify([1, 2, 3])) {
      throw new Error(`queue end with take drain failed: ${JSON.stringify(drained)}`)
    }
    const done = yield* Queue.take(queue).pipe(Effect.flip)
    if (!Cause.isDone(done)) {
      throw new Error("queue end with take done contract failed")
    }
    const awaited = yield* Queue.await(queue)
    if (awaited !== undefined) {
      throw new Error("queue await after end failed")
    }
    const offerResult = yield* Queue.offer(queue, 10)
    if (offerResult !== false) {
      throw new Error("queue accepted offer after end")
    }
  })

export const endEmitsAllItemsCase = () =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<number, Cause.Done>(2)
    yield* Effect.forkChild(Queue.offerAll(queue, [1, 2, 3, 4]))
    yield* Effect.forkChild(Queue.offerAll(queue, [5, 6, 7, 8]))
    yield* Effect.forkChild(Queue.offer(queue, 9))
    yield* Effect.forkChild(Queue.end(queue))

    const items = Array.from(yield* Stream.fromQueue(queue).pipe(Stream.runCollect))
    const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    if (JSON.stringify(items) !== JSON.stringify(expected)) {
      throw new Error(`queue end stream drain failed: ${JSON.stringify({ expected, items })}`)
    }
    const awaited = yield* Queue.await(queue)
    if (awaited !== undefined) {
      throw new Error("queue await after end failed")
    }
    const offerResult = yield* Queue.offer(queue, 10)
    if (offerResult !== false) {
      throw new Error("queue accepted offer after end")
    }
  })

export const pollReturnsOptionCase = () =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<number>(10)
    const empty = yield* Queue.poll(queue)
    if (!Option.isNone(empty)) {
      throw new Error(`queue poll empty contract failed: ${JSON.stringify(empty)}`)
    }
    yield* Queue.offer(queue, 42)
    const item = yield* Queue.poll(queue)
    if (!Option.isSome(item) || item.value !== 42) {
      throw new Error(`queue poll item contract failed: ${JSON.stringify(item)}`)
    }
    const emptyAgain = yield* Queue.poll(queue)
    if (!Option.isNone(emptyAgain)) {
      throw new Error(`queue poll empty after take contract failed: ${JSON.stringify(emptyAgain)}`)
    }
  })

export const shutdownCompletesAwaitCase = () =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<number>(1)
    const waiter = yield* Queue.await(queue).pipe(Effect.forkChild)
    const shutdown = yield* Queue.shutdown(queue)
    if (!shutdown) {
      throw new Error("queue shutdown returned false")
    }
    const exit = yield* Fiber.await(waiter)
    if (!Exit.hasInterrupts(exit)) {
      throw new Error(`queue await after shutdown failed: ${JSON.stringify(exit)}`)
    }
    const offerResult = yield* Queue.offer(queue, 1)
    if (offerResult !== false) {
      throw new Error("queue accepted offer after shutdown")
    }
  })
