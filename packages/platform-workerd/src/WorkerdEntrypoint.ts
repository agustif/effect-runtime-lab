/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as ServiceMap from "effect/ServiceMap";
import * as WorkerdContext from "./WorkerdContext.ts";
import * as WorkerdRpc from "./WorkerdRpc.ts";
import type * as WorkerdServices from "./WorkerdServices.ts";

/**
 * @since 1.0.0
 * @category models
 */
export interface EntrypointInvocationOptions<Exports = unknown, Event = unknown> {
  readonly event?: Event | undefined;
  eventKind: WorkerdContext.WorkerdEventKind,
  readonly exports?: Exports | undefined;
  readonly request?: Request | undefined;
}

const provideInvocation = <Env, Props, Exports, Event, A, E>(
  env: Env,
  ctx: ExecutionContext<Props>,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options: EntrypointInvocationOptions<Exports, Event>,
): Effect.Effect<A, E> =>
  Effect.provideServices(
    effect.pipe(Effect.provide(FetchHttpClient.layer)),
    ServiceMap.make(
      WorkerdContext.WorkerdContext,
      WorkerdContext.make({
        env,
        ctx,
        eventKind: options.eventKind,
        request: options.request,
        exports: options.exports,
        event: options.event,
      }),
    ),
  );

/**
 * @since 1.0.0
 * @category runtime
 */
export const run = <Env, Props, A, E>(
  env: Env,
  ctx: ExecutionContext<Props>,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options?: EntrypointInvocationOptions | undefined,
): Promise<A> =>
  Effect.runPromise(
    provideInvocation(env, ctx, effect, {
      eventKind: options?.eventKind ?? "rpc",
      ...options,
    }),
  ).catch((cause) => {
    throw WorkerdRpc.normalizeThrowable("run", cause);
  });

/**
 * @since 1.0.0
 * @category runtime
 */
export const runResult = <Env, Props, A, E>(
  env: Env,
  ctx: ExecutionContext<Props>,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options?: EntrypointInvocationOptions | undefined,
): Promise<WorkerdRpc.WorkerdResult<A, E>> =>
  Effect.runPromise(
    Effect.result(
      provideInvocation(env, ctx, effect, {
        eventKind: options?.eventKind ?? "rpc",
        ...options,
      }),
    ),
  ).then(WorkerdRpc.fromResult);
