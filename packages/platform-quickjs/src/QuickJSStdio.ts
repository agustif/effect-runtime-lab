/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import * as Cause from "effect/Cause"
import { systemError } from "effect/PlatformError"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"

type StdModule = {
  out?: { puts?: (value: string) => void }
  err?: { puts?: (value: string) => void }
}

type OsModule = {
  read?: (fd: number, buffer: ArrayBuffer, offset: number, length: number) => number
  write?: (fd: number, buffer: ArrayBuffer, offset: number, length: number) => number
}

declare const globalThis: {
  readonly std?: StdModule
  readonly os?: OsModule
  readonly process?: {
    readonly argv?: Array<string>
    readonly stdout?: { write?: (value: string | Uint8Array) => void }
    readonly stderr?: { write?: (value: string | Uint8Array) => void }
  }
}

const toUint8Array = (chunk: string | Uint8Array) => typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk
const toArrayBuffer = (chunk: Uint8Array): ArrayBuffer => {
  const bytes = new Uint8Array(chunk.byteLength)
  bytes.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength))
  return bytes.buffer
}

const writeTo = (
  channel: "stdout" | "stderr"
): Sink.Sink<void, string | Uint8Array, never, PlatformError.PlatformError> =>
  Sink.forEach((chunk: string | Uint8Array): Effect.Effect<void, PlatformError.PlatformError> =>
    Effect.try({
      try: () => {
        const text = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk)
        if (channel === "stdout" && globalThis.std?.out?.puts) {
          globalThis.std.out.puts(text)
          return
        }
        if (channel === "stderr" && globalThis.std?.err?.puts) {
          globalThis.std.err.puts(text)
          return
        }
        const fd = channel === "stdout" ? 1 : 2
        if (globalThis.os?.write) {
          const bytes = toUint8Array(chunk)
          const result = globalThis.os.write(fd, toArrayBuffer(bytes), 0, bytes.byteLength)
          if (result < 0) {
            throw new Error(`os.write failed with code ${result}`)
          }
          return
        }
        if (channel === "stdout" && globalThis.process?.stdout?.write) {
          globalThis.process.stdout.write(chunk)
          return
        }
        if (channel === "stderr" && globalThis.process?.stderr?.write) {
          globalThis.process.stderr.write(chunk)
          return
        }
        throw new Error(`No ${channel} writer available`)
      },
      catch: (cause) =>
        systemError({
          _tag: "Unknown",
          module: "QuickJSStdio",
          method: channel,
          cause
        })
    })
  )

const stdin: Stream.Stream<Uint8Array, PlatformError.PlatformError> = Stream.suspend(() =>
  globalThis.os?.read
    ? Stream.fromPull(
      Effect.succeed(
        Effect.try({
          try: () => {
            const buffer = new Uint8Array(64 * 1024)
            const result = globalThis.os!.read!(0, buffer.buffer, 0, buffer.byteLength)
            if (result < 0) {
              throw new Error(`os.read failed with code ${result}`)
            }
            if (result === 0) {
              return Cause.done()
            }
            return Effect.succeed([buffer.subarray(0, result)] as const)
          },
          catch: (cause) =>
            systemError({
              _tag: "Unknown",
              module: "QuickJSStdio",
              method: "stdin",
              cause
            })
        }).pipe(Effect.flatten)
      )
    )
    : Stream.empty
)

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = Layer.succeed(
  Stdio.Stdio,
  Stdio.make({
    args: Effect.sync(() => globalThis.process?.argv?.slice(2) ?? []),
    stdout: () => writeTo("stdout"),
    stderr: () => writeTo("stderr"),
    stdin
  })
)
