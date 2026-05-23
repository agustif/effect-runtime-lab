import { env as runtimeEnv } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as D1 from "@effect/sql-d1";
import * as CloudflareD1 from "../src/index.ts";

describe("CloudflareD1", () => {
  it("queries a Workers D1 binding through the vendored Effect client", async () => {
    const env = runtimeEnv as Cloudflare.Env & { readonly DB: D1Database };
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)")
      .run();
    await env.DB.prepare("DELETE FROM test").run();

    const rows = await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* D1.D1Client.D1Client;
        yield* sql`INSERT INTO test (name) VALUES (${"Ada"})`;
        return yield* sql`SELECT * FROM test`;
      }).pipe(Effect.provide(CloudflareD1.layer(env.DB))),
    );

    expect(rows).toEqual([{ id: 1, name: "Ada" }]);
  });
});
