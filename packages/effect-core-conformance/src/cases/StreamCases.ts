import { Cause, Duration, Effect, Exit, Fiber, Latch, Queue, Ref, Schedule, Sink, Stream } from "effect"

export const callbackCleanupCase = () =>
  Effect.gen(function* () {
    let cleanup = false
    const latch = yield* Latch.make()
    const fiber = yield* Stream.callback<void>(Effect.fnUntraced(function*(queue) {
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          cleanup = true
        })
      )
      yield* Queue.offer(queue, void 0)
    })).pipe(
      Stream.tap(() => latch.open),
      Stream.runDrain,
      Effect.forkChild
    )

    yield* latch.await
    yield* Fiber.interrupt(fiber)
    if (!cleanup) {
      throw new Error("stream callback cleanup did not run")
    }
  })

export const callbackBackpressureCase = () =>
  Effect.gen(function* () {
    let count = 0
    let offered = 0
    let done = false

    const pull = yield* Stream.callback<number>((queue) =>
      Effect.forEach(
        [1, 2, 3, 4, 5, 6, 7],
        Effect.fnUntraced(function*(n) {
          count++
          yield* Queue.offer(queue, n)
          offered++
        }),
        { concurrency: "unbounded" }
      ).pipe(Effect.tap(() => Effect.sync(() => { done = true }))),
      { bufferSize: 2 }
    ).pipe(Stream.toPull)

    yield* Effect.yieldNow
    if (count !== 7 || offered !== 2 || done !== false) {
      throw new Error(`stream backpressure pre-pull failed: count=${count} offered=${offered} done=${done}`)
    }

    const first = yield* pull
    if (first.length !== 2 || first[0] !== 1 || first[1] !== 2) {
      throw new Error(`stream backpressure first pull failed: ${JSON.stringify(first)}`)
    }
  })

export const callbackSignalsEndCase = () =>
  Effect.gen(function* () {
    const result = yield* Stream.callback<number>((queue) => {
      Queue.endUnsafe(queue)
      return Effect.void
    }).pipe(Stream.runCollect)
    if (result.length !== 0) {
      throw new Error(`stream end contract failed: ${JSON.stringify(result)}`)
    }
  })

export const callbackHandlesErrorsCase = () =>
  Effect.gen(function* () {
    const error = new Error("boom")
    const result = yield* Stream.callback<number, Error>((queue) => {
      Queue.failCauseUnsafe(queue, Cause.fail(error))
      return Effect.void
    }).pipe(
      Stream.runCollect,
      Effect.exit
    )
      if (JSON.stringify(result) !== JSON.stringify(Exit.fail(error))) {
        throw new Error("stream error contract failed")
      }
    })

export const callbackHandlesDefectsCase = () =>
  Effect.gen(function* () {
    const error = new Error("boom")
    const result = yield* Stream.callback<number, Error>(() => {
      throw error
    }).pipe(
      Stream.runCollect,
      Effect.exit
    )
    if (JSON.stringify(result) !== JSON.stringify(Exit.die(error))) {
      throw new Error("stream defect contract failed")
    }
  })

export const aggregateWithinInterruptPropagationCase = () =>
  Effect.gen(function* () {
    const ref = yield* Ref.make(false)
    const sink = Sink.fromEffect(
      Effect.never.pipe(
        Effect.onInterrupt(() => Ref.set(ref, true))
      )
    )
    const fiber = yield* Stream.make(1, 1, 2).pipe(
      Stream.aggregateWithin(sink, Schedule.spaced(Duration.minutes(30))),
      Stream.runCollect,
      Effect.forkChild
    )
    yield* Effect.yieldNow
    yield* Fiber.interrupt(fiber)
    const interrupted = yield* Ref.get(ref)
    if (!interrupted) {
      throw new Error("stream interruption did not propagate to sink")
    }
  })

export const aggregateWithinDefectPropagationCase = () =>
  Effect.gen(function* () {
    const error = new Error("boom")
    const sink = Sink.fromEffect(Effect.die(error))
    const result = yield* Stream.make(1, 1).pipe(
      Stream.aggregateWithin(sink, Schedule.spaced(Duration.minutes(30))),
      Stream.runCollect,
      Effect.exit
    )
    if (JSON.stringify(result) !== JSON.stringify(Exit.die(error))) {
      throw new Error("stream aggregateWithin defect contract failed")
    }
  })
