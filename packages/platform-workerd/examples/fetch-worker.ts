import * as Effect from "effect/Effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as WorkerdContext from "../src/WorkerdContext.ts";
import * as WorkerdHandler from "../src/WorkerdHandler.ts";

interface Env {
  readonly APP_NAME: string;
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext<unknown>) =>
    WorkerdHandler.fetch<Env, unknown, never, unknown>(
      (_request) =>
      Effect.gen(function* () {
        const eventKind = yield* WorkerdContext.eventKind;
        yield* WorkerdContext.waitUntil(
          Effect.log(`handled ${eventKind} for ${env.APP_NAME}`),
        ).pipe(Effect.orDie);
        yield* WorkerdContext.passThroughOnException().pipe(Effect.orDie);

        return HttpServerResponse.text(`hello from ${env.APP_NAME}`);
      }).pipe(Effect.orDie),
      {
        exports: (loopbackCtx: ExecutionContext<unknown>) =>
          (loopbackCtx as ExecutionContext<unknown> & { exports?: unknown }).exports,
      },
    )(request, env, ctx),
};
