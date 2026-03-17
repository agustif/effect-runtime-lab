/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import { systemError } from "effect/PlatformError"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"

type TxikiGlobal = {
  readonly args?: ReadonlyArray<string>
  readonly stdin?: ReadableStream<Uint8Array>
  readonly stdout?: WritableStream<Uint8Array>
  readonly stderr?: WritableStream<Uint8Array>
}

const getTxiki = () => (globalThis as typeof globalThis & { tjs?: TxikiGlobal }).tjs
const encoder = new TextEncoder()

const writableSink = (
  stream: WritableStream<Uint8Array> | undefined,
  method: string
): Sink.Sink<void, string | Uint8Array, never, PlatformError.PlatformError> =>
  Sink.forEach((chunk: string | Uint8Array): Effect.Effect<void, PlatformError.PlatformError> =>
    Effect.tryPromise({
      try: async () => {
        const txiki = getTxiki()
        const actualStream = stream ?? (method === "stdout" ? txiki?.stdout : txiki?.stderr)
        if (!actualStream) {
          throw new Error(`No ${method} stream available`)
        }
        const writer = actualStream.getWriter()
        try {
          await writer.write(typeof chunk === "string" ? encoder.encode(chunk) : chunk)
        } finally {
          writer.releaseLock()
        }
      },
      catch: (cause) =>
        systemError({
          _tag: "Unknown",
          module: "TxikiStdio",
          method,
          cause
        })
    })
  )

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = Layer.succeed(
  Stdio.Stdio,
  Stdio.make({
    args: Effect.sync(() => getTxiki()?.args?.slice(1) ?? []),
    stdout: () => writableSink(getTxiki()?.stdout, "stdout"),
    stderr: () => writableSink(getTxiki()?.stderr, "stderr"),
    stdin: Stream.suspend(() => {
      const stdin = getTxiki()?.stdin
      return stdin
        ? Stream.fromReadableStream({
          evaluate: () => stdin,
          onError: (cause) =>
            systemError({
              _tag: "Unknown",
              module: "TxikiStdio",
              method: "stdin",
              cause
            })
        })
        : Stream.fail(
          PlatformError.badArgument({
            module: "TxikiStdio",
            method: "stdin",
            description: "txiki stdin stream is not available"
          })
        )
    })
  })
)
