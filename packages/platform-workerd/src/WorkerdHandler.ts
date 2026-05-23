/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpEffect from "effect/unstable/http/HttpEffect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as ServiceMap from "effect/ServiceMap";
import * as WorkerdContext from "./WorkerdContext.ts";
import type * as WorkerdServices from "./WorkerdServices.ts";

export type LoopbackExportsOption<Props, Exports> =
  | Exports
  | ((ctx: ExecutionContext<Props>) => Exports);

const resolveLoopbackExports = <Props, Exports>(
  ctx: ExecutionContext<Props>,
  option?: LoopbackExportsOption<Props, Exports> | undefined,
): Exports | undefined => {
  if (option === undefined) {
    return undefined;
  }

  return typeof option === "function"
    ? (option as (ctx: ExecutionContext<Props>) => Exports)(ctx)
    : option;
};

const provideInvocation = <Env, Props, Exports, A, E>(
  env: Env,
  ctx: ExecutionContext<Props>,
  eventKind: WorkerdContext.WorkerdEventKind,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options?: {
    readonly exports?: LoopbackExportsOption<Props, Exports> | undefined;
    readonly request?: Request | undefined;
    readonly event?: unknown;
  },
): Effect.Effect<A, E> =>
  Effect.provideServices(
    effect.pipe(Effect.provide(FetchHttpClient.layer)),
    ServiceMap.make(
      WorkerdContext.WorkerdContext,
      WorkerdContext.make({
        env,
        ctx,
        eventKind,
        request: options?.request,
        event: options?.event,
        exports: resolveLoopbackExports(ctx, options?.exports),
      }),
    ),
  );

/**
 * @since 1.0.0
 * @category handlers
 */
export const fetch =
  <Env, Props, E, Exports = unknown>(
    handler: (
      request: Request,
    ) => Effect.Effect<HttpServerResponse.HttpServerResponse, E, WorkerdServices.WorkerdServices>,
    options?: {
      readonly exports?: LoopbackExportsOption<Props, Exports> | undefined;
    },
  ) =>
  (
    request: Request,
    env: Env,
    ctx: ExecutionContext<Props>,
  ): Promise<Response> =>
    HttpEffect.toWebHandler(
      provideInvocation(env, ctx, "fetch", handler(request), {
        exports: options?.exports,
        request,
      }),
    )(request);

/**
 * @since 1.0.0
 * @category handlers
 */
export const scheduled =
  <Env, Props, A, E>(
    handler: (
      controller: ScheduledController,
    ) => Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  ) =>
  (
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext<Props>,
  ): Promise<void> =>
    Effect.runPromise(
      provideInvocation(env, ctx, "scheduled", handler(controller), { event: controller }),
    ).then(() => undefined);

/**
 * @since 1.0.0
 * @category handlers
 */
export const queue =
  <Env, Props, Body, A, E>(
    handler: (batch: MessageBatch<Body>) => Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  ) =>
  (
    batch: MessageBatch<Body>,
    env: Env,
    ctx: ExecutionContext<Props>,
  ): Promise<void> =>
    Effect.runPromise(provideInvocation(env, ctx, "queue", handler(batch), { event: batch })).then(
      () => undefined,
    );

/**
 * @since 1.0.0
 * @category handlers
 */
export const tail =
  <Env, Props, A, E>(
    handler: (
      events: ReadonlyArray<TailEvent>,
    ) => Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  ) =>
  (
    events: ReadonlyArray<TailEvent>,
    env: Env,
    ctx: ExecutionContext<Props>,
  ): Promise<void> =>
    Effect.runPromise(provideInvocation(env, ctx, "tail", handler(events), { event: events })).then(
      () => undefined,
    );

/**
 * @since 1.0.0
 * @category handlers
 */
export const trace =
  <Env, Props, A, E>(
    handler: (
      events: ReadonlyArray<TraceItem>,
    ) => Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  ) =>
  (
    events: ReadonlyArray<TraceItem>,
    env: Env,
    ctx: ExecutionContext<Props>,
  ): Promise<void> =>
    Effect.runPromise(
      provideInvocation(env, ctx, "trace", handler(events), { event: events }),
    ).then(() => undefined);

/**
 * @since 1.0.0
 * @category handlers
 */
export const test =
  <Env, Props, A, E>(
    handler: (controller: TestController) => Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  ) =>
  (
    controller: TestController,
    env: Env,
    ctx: ExecutionContext<Props>,
  ): Promise<void> =>
    Effect.runPromise(
      provideInvocation(env, ctx, "test", handler(controller), { event: controller }),
    ).then(() => undefined);
