/**
 * @since 1.0.0
 */
import { MQuickJS, type EvalOptions, type HostObject, type MQuickJSOptions } from "@ok.lol/mquickjs"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import * as ServiceMap from "effect/ServiceMap"
import type { QuickJSRuntime } from "@effect-experimental/platform-quickjs-shared"

const runtimeError = (method: string, description: string, cause: unknown) =>
  PlatformError.badArgument({
    module: "MicroQuickJSRuntime",
    method,
    description,
    cause
  })

export interface MicroQuickJSRuntime extends QuickJSRuntime {
  readonly eval: (code: string, options?: EvalOptions) => Promise<unknown>
  readonly expose: (name: string, object: HostObject) => Promise<void>
}

export interface MicroQuickJSCreateOptions extends MQuickJSOptions {}

export type { EvalOptions, HostHandler, HostObject, MQuickJSOptions } from "@ok.lol/mquickjs"

const makeRuntime = (engine: MQuickJS): MicroQuickJSRuntime => ({
  executeCode: (code) => engine.eval(code),
  eval: (code, options) => engine.eval(code, options),
  expose: (name, object) => engine.expose(name, object),
  dispose: () => engine.dispose()
})

export const preload = (options?: Pick<MQuickJSOptions, "locateFile">) => {
  MQuickJS.preload(options)
}

export const create = async (options?: MicroQuickJSCreateOptions): Promise<MicroQuickJSRuntime> =>
  makeRuntime(await MQuickJS.create(options))

export const createEffect = (options?: MicroQuickJSCreateOptions) =>
  Effect.tryPromise({
    try: () => create(options),
    catch: (cause) => runtimeError("create", "failed to initialize the MicroQuickJS engine", cause)
  })

export const evalEffect = (
  runtime: MicroQuickJSRuntime,
  code: string,
  options?: EvalOptions
) =>
  Effect.tryPromise({
    try: () => runtime.eval(code, options),
    catch: (cause) => runtimeError("eval", "guest evaluation failed", cause)
  })

export const exposeEffect = (
  runtime: MicroQuickJSRuntime,
  name: string,
  object: HostObject
) =>
  Effect.tryPromise({
    try: () => runtime.expose(name, object),
    catch: (cause) => runtimeError("expose", `failed to expose host object '${name}'`, cause)
  })

export class MicroQuickJSEngine extends ServiceMap.Service<MicroQuickJSEngine, MicroQuickJSRuntime>()(
  "@effect-experimental/platform-microquickjs/MicroQuickJSEngine"
) {}

export const layer = (options?: MicroQuickJSCreateOptions) =>
  Layer.effect(MicroQuickJSEngine)(
    Effect.acquireRelease(
      createEffect(options),
      (runtime) => Effect.sync(() => runtime.dispose())
    )
  )
