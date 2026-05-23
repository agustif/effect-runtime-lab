import {
  DurableObject,
  WorkerEntrypoint,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as WorkerdContext from "../src/WorkerdContext.ts";
import * as WorkerdDurableObject from "../src/WorkerdDurableObject.ts";
import * as WorkerdEntrypoint from "../src/WorkerdEntrypoint.ts";
import * as WorkerdHandler from "../src/WorkerdHandler.ts";
import * as WorkerdRpc from "../src/WorkerdRpc.ts";
import * as WorkerdWorkflow from "../src/WorkerdWorkflow.ts";

export interface Env {
  readonly COUNTER: DurableObjectNamespace<CounterDurableObject>;
  readonly WORKFLOW: Workflow;
}

export interface CounterProps {
  readonly counterId: string;
}

const resolveLoopbackExports = (ctx: ExecutionContext<unknown>) =>
  (ctx as ExecutionContext<unknown> & { readonly exports?: Record<string, unknown> }).exports;

export class CounterWorker extends WorkerEntrypoint<Env, CounterProps> {
  increment(by = 1) {
    return WorkerdEntrypoint.runResult(
      this.env,
      this.ctx,
      Effect.gen(function* () {
        const props = yield* WorkerdContext.props<CounterProps>();
        yield* WorkerdContext.waitUntil(Effect.void).pipe(Effect.orDie);

        return {
          counterId: props.counterId,
          incrementedBy: by,
        };
      }),
    );
  }
}

export class CounterDurableObject extends DurableObject<Env> {
  readonly runtime: WorkerdDurableObject.DurableObjectRuntime;
  builds = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.runtime = WorkerdDurableObject.makeRuntime(
      env,
      ctx,
      Layer.effectContext(
        Effect.sync(() => {
          this.builds += 1;
          return Context.empty();
        }),
      ),
    );
  }

  override fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/builds") {
      return Promise.resolve(new Response(String(this.builds)));
    }

    return this.runtime.run(
      Effect.gen(function* () {
        const state = yield* WorkerdContext.executionContext<DurableObjectState>();
        const current = (yield* Effect.promise(() => state.storage.get<number>("count"))) ?? 0;
        const next = current + Number(url.searchParams.get("by") ?? "1");
        yield* Effect.promise(() => state.storage.put("count", next));
        return new Response(String(next));
      }),
      {
        eventKind: "durable-object",
        request,
      },
    );
  }
}

export class ExampleWorkflow extends WorkflowEntrypoint<Env, { readonly value: number }> {
  override async run(event: WorkflowEvent<{ readonly value: number }>, step: WorkflowStep) {
    await step.do("noop", async () => event.payload.value);

    return WorkerdWorkflow.run(
      this.env,
      this.ctx,
      Effect.gen(function* () {
        const workflowEvent = yield* WorkerdContext.event<
          WorkflowEvent<{ readonly value: number }>
        >();
        return workflowEvent.payload.value + 1;
      }),
      { event },
    );
  }
}

export default {
  fetch: WorkerdHandler.fetch<Env, unknown, never, Record<string, unknown>>(
    (request) =>
      Effect.gen(function* () {
        const url = new URL(request.url);

        if (url.pathname === "/context") {
          yield* WorkerdContext.passThroughOnException().pipe(Effect.orDie);
          const props = yield* WorkerdContext.props<Record<string, never>>();
          const loopback = yield* WorkerdContext.exportsValue<Record<string, unknown>>().pipe(
            Effect.orDie,
          );

          return yield* HttpServerResponse.json({
            hasCounterWorker: "CounterWorker" in loopback,
            props,
          }).pipe(Effect.orDie);
        }

        if (url.pathname === "/rpc") {
          const loopback = yield* WorkerdContext.exportsValue<{
            readonly CounterWorker: (options: {
              readonly props: CounterProps;
            }) => {
              readonly increment: (
                by?: number,
              ) => Promise<
                WorkerdRpc.WorkerdResult<
                  {
                    readonly counterId: string;
                    readonly incrementedBy: number;
                  },
                  never
                >
              >;
            };
          }>().pipe(Effect.orDie);

          const result = yield* Effect.promise(() =>
            loopback.CounterWorker({ props: { counterId: "counter-1" } }).increment(2),
          );

          return yield* HttpServerResponse.json(result).pipe(Effect.orDie);
        }

        return HttpServerResponse.text("ok");
      }),
    {
      exports: resolveLoopbackExports,
    },
  ),
} satisfies ExportedHandler<Env>;
