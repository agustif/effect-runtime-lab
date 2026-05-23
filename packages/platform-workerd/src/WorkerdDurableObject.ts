/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as WorkerdContext from "./WorkerdContext.ts";
import * as WorkerdRpc from "./WorkerdRpc.ts";
import type * as WorkerdServices from "./WorkerdServices.ts";

/**
 * @since 1.0.0
 * @category models
 */
export interface DurableObjectInvocationOptions<Exports = unknown, Event = unknown> {
  readonly event?: Event | undefined;
  readonly eventKind?: WorkerdContext.WorkerdEventKind | undefined;
  readonly exports?: Exports | undefined;
  readonly request?: Request | undefined;
}

/**
 * @since 1.0.0
 * @category models
 */
export interface DurableObjectRuntime {
  readonly run: <A, E>(
    effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
    options?: DurableObjectInvocationOptions | undefined,
  ) => Promise<A>;
  readonly runResult: <A, E>(
    effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
    options?: DurableObjectInvocationOptions | undefined,
  ) => Promise<WorkerdRpc.WorkerdResult<A, E>>;
  readonly dispose: () => Promise<void>;
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const makeRuntime = <Env, Props>(
  env: Env,
  ctx: DurableObjectState<Props>,
  baseLayer?: Layer.Layer<never, never>,
): DurableObjectRuntime => {
  const memoMap = Layer.makeMemoMapUnsafe();
  const scope = Scope.makeUnsafe();

  const runPromise = async <A, E, Exports, Event>(
    effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
    options?: DurableObjectInvocationOptions<Exports, Event> | undefined,
  ) => {
    const workerdLayer = Layer.mergeAll(
      FetchHttpClient.layer,
      WorkerdContext.layer({
        env,
        ctx,
        request: options?.request,
        eventKind: options?.eventKind ?? "durable-object",
        exports: options?.exports,
        event: options?.event,
      }),
    );

    if (baseLayer === undefined) {
      const services = await Effect.runPromise(
        Layer.buildWithMemoMap(workerdLayer, memoMap, scope),
      );

      return Effect.runPromise(Effect.provide(effect, services));
    }

    const services = await Effect.runPromise(
      Layer.buildWithMemoMap(Layer.mergeAll(baseLayer, workerdLayer), memoMap, scope),
    );

    return Effect.runPromise(Effect.provide(effect, services));
  };

  return {
    run(effect, options) {
      return runPromise(effect, options).catch((cause) => {
        throw WorkerdRpc.normalizeThrowable("durable-object/run", cause);
      });
    },
    runResult(effect, options) {
      return runPromise(Effect.result(effect), options).then(WorkerdRpc.fromResult);
    },
    dispose() {
      return Effect.runPromise(Scope.close(scope, Exit.void));
    },
  };
};

/**
 * @since 1.0.0
 * @category runtime
 */
export const run = <Env, Props, A, E>(
  env: Env,
  ctx: DurableObjectState<Props>,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options?: DurableObjectInvocationOptions | undefined,
  baseLayer?: Layer.Layer<never, never>,
): Promise<A> => {
  const runtime = makeRuntime(env, ctx, baseLayer);
  return runtime.run(effect, options).finally(() => runtime.dispose());
};

/**
 * @since 1.0.0
 * @category runtime
 */
export const runResult = <Env, Props, A, E>(
  env: Env,
  ctx: DurableObjectState<Props>,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options?: DurableObjectInvocationOptions | undefined,
  baseLayer?: Layer.Layer<never, never>,
): Promise<WorkerdRpc.WorkerdResult<A, E>> => {
  const runtime = makeRuntime(env, ctx, baseLayer);
  return runtime.runResult(effect, options).finally(() => runtime.dispose());
};
