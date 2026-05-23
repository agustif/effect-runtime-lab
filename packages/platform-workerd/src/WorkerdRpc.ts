/**
 * @since 1.0.0
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as WorkerdContext from "./WorkerdContext.ts";

type DisposableLike = {
  [Symbol.dispose]?: () => void;
};

type DupableLike<A> = {
  dup?: () => A;
};

/**
 * @since 1.0.0
 * @category models
 */
export type WorkerdResult<A, E> =
  | {
      readonly _tag: "Success";
      readonly value: A;
    }
  | {
      readonly _tag: "Failure";
      readonly error: E;
    };

/**
 * @since 1.0.0
 * @category errors
 */
export class WorkerdRpcError extends Data.TaggedError("WorkerdRpcError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {
  override get message() {
    return `Workerd RPC failure during ${this.operation}`;
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Lease<A> {
  readonly raw: A;
  readonly dup: Effect.Effect<Lease<A>, WorkerdRpcError>;
  readonly dispose: Effect.Effect<void, WorkerdRpcError>;
  readonly use: <B, E, R>(
    f: (raw: A) => Effect.Effect<B, E, R>,
  ) => Effect.Effect<B, E | WorkerdRpcError, R>;
}

const hasDispose = (value: unknown): value is DisposableLike =>
  value !== null && (typeof value === "object" || typeof value === "function") && Symbol.dispose in value;

const hasDup = <A>(value: A): value is A & DupableLike<A> =>
  value !== null && (typeof value === "object" || typeof value === "function") && "dup" in value;

const makeLease = <A>(value: A): Lease<A> => ({
  raw: value,
  dup: hasDup(value)
    ? Effect.try({
        try: () => makeLease(value.dup!()),
        catch: (cause) => new WorkerdRpcError({ operation: "dup", cause }),
      })
    : Effect.fail(
        new WorkerdRpcError({
          operation: "dup",
          cause: new Error("RPC capability does not support dup()"),
        }),
      ),
  dispose: hasDispose(value)
    ? Effect.try({
        try: () => {
          value[Symbol.dispose]?.();
        },
        catch: (cause) => new WorkerdRpcError({ operation: "dispose", cause }),
      })
    : Effect.void,
  use: <B, E, R>(f: (raw: A) => Effect.Effect<B, E, R>) =>
    hasDispose(value)
      ? Effect.acquireUseRelease(
          Effect.succeed(value),
          (raw) => f(raw),
          () =>
            Effect.try({
              try: () => {
                value[Symbol.dispose]?.();
              },
              catch: (cause) => new WorkerdRpcError({ operation: "dispose", cause }),
            }),
        )
      : f(value),
});

/**
 * @since 1.0.0
 * @category constructors
 */
export const success = <A, E = never>(value: A): WorkerdResult<A, E> => ({
  _tag: "Success",
  value,
});

/**
 * @since 1.0.0
 * @category constructors
 */
export const failure = <A = never, E = never>(error: E): WorkerdResult<A, E> => ({
  _tag: "Failure",
  error,
});

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromResult = <A, E>(result: Result.Result<A, E>): WorkerdResult<A, E> =>
  Result.match(result, {
    onSuccess: success,
    onFailure: failure,
  });

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromStub = <A>(stub: A): Lease<A> => makeLease(stub);

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromTarget = <A>(target: A): Lease<A> => makeLease(target);

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromServiceBinding = <A>(binding: A): Lease<A> => makeLease(binding);

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromExports = <A>(
  select: (value: unknown) => A,
): Effect.Effect<
  Lease<A>,
  WorkerdContext.WorkerdContextError | WorkerdRpcError,
  WorkerdContext.WorkerdContext
> =>
  Effect.flatMap(WorkerdContext.exportsValue(), (value) =>
    Effect.try({
      try: () => makeLease(select(value)),
      catch: (cause) => new WorkerdRpcError({ operation: "fromExports", cause }),
    }),
  );

/**
 * @since 1.0.0
 * @category helpers
 */
export const normalizeThrowable = (operation: string, cause: unknown): WorkerdRpcError =>
  new WorkerdRpcError({ operation, cause });
