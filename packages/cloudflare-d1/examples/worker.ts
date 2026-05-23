import * as Effect from "effect/Effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as D1 from "@effect/sql-d1";
import * as WorkerdHandler from "@effect-experimental/platform-workerd/WorkerdHandler";
import * as CloudflareD1 from "../src/index.ts";

interface Env {
  readonly DB: D1Database;
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    WorkerdHandler.fetch<Env, unknown, never>(() => {
      const d1Layer = CloudflareD1.layer(env.DB);
      return Effect.gen(function* () {
        const sql = yield* D1.D1Client.D1Client;
        const rows = yield* sql`SELECT 1 as ok`;
        return yield* HttpServerResponse.json(rows);
      }).pipe(Effect.provide(d1Layer), Effect.orDie);
    })(request, env, ctx),
};
