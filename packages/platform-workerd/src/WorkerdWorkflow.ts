/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect";
import * as WorkerdEntrypoint from "./WorkerdEntrypoint.ts";
import type * as WorkerdServices from "./WorkerdServices.ts";

export interface WorkflowInvocationOptions<Exports = unknown, Event = unknown> {
  readonly event?: Event | undefined;
  readonly exports?: Exports | undefined;
  readonly request?: Request | undefined;
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const run = <Env, A, E>(
  env: Env,
  ctx: ExecutionContext,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options?: WorkflowInvocationOptions | undefined,
) =>
  WorkerdEntrypoint.run(env, ctx, effect, {
    ...options,
    eventKind: "workflow",
  });

/**
 * @since 1.0.0
 * @category runtime
 */
export const runResult = <Env, A, E>(
  env: Env,
  ctx: ExecutionContext,
  effect: Effect.Effect<A, E, WorkerdServices.WorkerdServices>,
  options?: WorkflowInvocationOptions | undefined,
) =>
  WorkerdEntrypoint.runResult(env, ctx, effect, {
    ...options,
    eventKind: "workflow",
  });
