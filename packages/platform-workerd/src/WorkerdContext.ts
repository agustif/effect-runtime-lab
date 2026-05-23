/**
 * @since 1.0.0
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";

const TypeId = "~@effect-experimental/platform-workerd/WorkerdContext";

/**
 * @since 1.0.0
 * @category models
 */
export type WorkerdEventKind =
  | "fetch"
  | "scheduled"
  | "queue"
  | "tail"
  | "trace"
  | "test"
  | "rpc"
  | "durable-object"
  | "workflow";

/**
 * @since 1.0.0
 * @category models
 */
export interface InvocationContext<Props = unknown> {
  readonly props: Props;
  readonly waitUntil: (promise: Promise<unknown>) => void;
}

/**
 * @since 1.0.0
 * @category models
 */
export interface FetchContext<Props = unknown> extends InvocationContext<Props> {
  readonly passThroughOnException: () => void;
}

/**
 * @since 1.0.0
 * @category models
 */
export interface InvocationOptions<
  Env = unknown,
  Props = unknown,
  Ctx extends InvocationContext<Props> = InvocationContext<Props>,
  Exports = unknown,
  Event = unknown,
> {
  readonly env: Env;
  readonly ctx: Ctx;
  readonly eventKind: WorkerdEventKind;
  readonly request?: Request | undefined;
  readonly exports?: Exports;
  readonly event?: Event | undefined;
}

/**
 * @since 1.0.0
 * @category errors
 */
export class WorkerdContextError extends Data.TaggedError("WorkerdContextError")<{
  readonly field: string;
}> {
  override get message() {
    return `Missing workerd invocation field: ${this.field}`;
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface WorkerdContext {
  readonly [TypeId]: typeof TypeId;
  readonly env: unknown;
  readonly ctx: InvocationContext;
  readonly request: Request | undefined;
  readonly eventKind: WorkerdEventKind;
  readonly exports: unknown;
  readonly event: unknown;
  readonly passThroughOnException: (() => void) | undefined;
  readonly waitUntil: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<void, WorkerdContextError, R>;
}

/**
 * @since 1.0.0
 * @category tags
 */
export const WorkerdContext: ServiceMap.Service<WorkerdContext, WorkerdContext> =
  ServiceMap.Service(TypeId);

const expectDefined = <A>(
  value: A | undefined,
  field: string,
): Effect.Effect<A, WorkerdContextError> =>
  value === undefined ? Effect.fail(new WorkerdContextError({ field })) : Effect.succeed(value);

const getPassThroughOnException = <Props>(
  ctx: InvocationContext<Props>,
): (() => void) | undefined =>
  "passThroughOnException" in ctx && typeof ctx.passThroughOnException === "function"
    ? () => (ctx as FetchContext<Props>).passThroughOnException()
    : undefined;

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  Env = unknown,
  Props = unknown,
  Ctx extends InvocationContext<Props> = InvocationContext<Props>,
  Exports = unknown,
  Event = unknown,
>(
  options: InvocationOptions<Env, Props, Ctx, Exports, Event>,
): WorkerdContext =>
  WorkerdContext.of({
    [TypeId]: TypeId,
    env: options.env,
    ctx: options.ctx,
    request: options.request,
    eventKind: options.eventKind,
    exports: options.exports,
    event: options.event,
    passThroughOnException: getPassThroughOnException(options.ctx),
    waitUntil: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.gen(function* () {
        const services = yield* Effect.services<R>();
        options.ctx.waitUntil(
          Effect.runPromiseExit(Effect.provideServices(effect, services)).then(() => undefined),
        );
      }),
  });

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = <
  Env = unknown,
  Props = unknown,
  Ctx extends InvocationContext<Props> = InvocationContext<Props>,
  Exports = unknown,
  Event = unknown,
>(
  options: InvocationOptions<Env, Props, Ctx, Exports, Event>,
): Layer.Layer<WorkerdContext> => Layer.succeed(WorkerdContext, make(options));

/**
 * @since 1.0.0
 * @category accessors
 */
export const context: Effect.Effect<WorkerdContext, never, WorkerdContext> =
  Effect.service(WorkerdContext);

/**
 * @since 1.0.0
 * @category accessors
 */
export const env: Effect.Effect<unknown, never, WorkerdContext> = Effect.map(
  context,
  (value) => value.env,
);

/**
 * @since 1.0.0
 * @category accessors
 */
export const executionContext = <
  Ctx extends InvocationContext = InvocationContext,
>(): Effect.Effect<Ctx, never, WorkerdContext> =>
  Effect.map(context, (value) => value.ctx as Ctx);

/**
 * @since 1.0.0
 * @category accessors
 */
export const request = (): Effect.Effect<Request, WorkerdContextError, WorkerdContext> =>
  Effect.flatMap(context, (value) => expectDefined(value.request, "request"));

/**
 * @since 1.0.0
 * @category accessors
 */
export const eventKind: Effect.Effect<WorkerdEventKind, never, WorkerdContext> = Effect.map(
  context,
  (value) => value.eventKind,
);

/**
 * @since 1.0.0
 * @category accessors
 */
export const exportsValue = <
  Exports = unknown,
>(): Effect.Effect<Exports, WorkerdContextError, WorkerdContext> =>
  Effect.flatMap(context, (value) => expectDefined(value.exports as Exports | undefined, "exports"));

/**
 * @since 1.0.0
 * @category accessors
 */
export const event = <Event = unknown>(): Effect.Effect<Event, WorkerdContextError, WorkerdContext> =>
  Effect.flatMap(context, (value) => expectDefined(value.event as Event | undefined, "event"));

/**
 * @since 1.0.0
 * @category accessors
 */
export const props = <Props = unknown>(): Effect.Effect<Props, never, WorkerdContext> =>
  Effect.map(context, (value) => value.ctx.props as Props);

/**
 * @since 1.0.0
 * @category lifecycle
 */
export const waitUntil = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<void, WorkerdContextError, WorkerdContext | R> =>
  Effect.flatMap(context, (value) => value.waitUntil(effect));

/**
 * @since 1.0.0
 * @category lifecycle
 */
export const passThroughOnException = (): Effect.Effect<
  void,
  WorkerdContextError,
  WorkerdContext
> =>
  Effect.flatMap(context, (value) =>
    Effect.flatMap(
      expectDefined(value.passThroughOnException, "ctx.passThroughOnException"),
      (passThrough) => Effect.sync(() => passThrough()),
    ),
  );
