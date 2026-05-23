import * as Effect from "effect/Effect";
import { DurableObject } from "cloudflare:workers";
import * as WorkerdDurableObject from "../src/WorkerdDurableObject.ts";

interface Env {
  readonly APP_NAME: string;
}

export class CounterDurableObject extends DurableObject<Env> {
  readonly runtime: WorkerdDurableObject.DurableObjectRuntime;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.runtime = WorkerdDurableObject.makeRuntime(env, ctx);
  }

  override fetch(request: Request) {
    return this.runtime.run(
      Effect.succeed(new Response(`durable hello: ${request.url}`)),
      {
        request,
        eventKind: "durable-object",
      },
    );
  }
}
