import * as Effect from "effect/Effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";
import * as WorkerdHandler from "@effect-experimental/platform-workerd/WorkerdHandler";
import * as CloudflareKv from "../src/index.ts";

interface Env {
  readonly KV: KVNamespace;
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    WorkerdHandler.fetch<Env, unknown, never>(() => {
      const kvLayer = CloudflareKv.layer(env.KV);
      return Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore;

        const key = new URL(request.url).searchParams.get("key") ?? "counter";
        const value = (yield* store.get(key)) ?? "0";
        const next = String(Number(value) + 1);
        yield* store.set(key, next);

        return yield* HttpServerResponse.json({ key, value: next });
      }).pipe(Effect.provide(kvLayer), Effect.orDie);
    })(request, env, ctx),
};
