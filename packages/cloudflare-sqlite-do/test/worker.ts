import { DurableObject } from "cloudflare:workers";
import * as Effect from "effect/Effect";
import * as SqliteDo from "@effect/sql-sqlite-do";
import * as CloudflareSqliteDo from "../src/index.ts";

interface Env {
  readonly SQLITE_DB: DurableObjectNamespace<SqliteCounterObject>;
}

export class SqliteCounterObject extends DurableObject<Env> {
  override async fetch() {
    return await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqliteDo.SqliteClient.SqliteClient;
        yield* sql`CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)`;
        yield* sql`DELETE FROM test`;
        yield* sql`INSERT INTO test (name) VALUES (${"Ada"})`;
        const rows = yield* sql`SELECT * FROM test`;
        return new Response(JSON.stringify(rows));
      }).pipe(Effect.provide(CloudflareSqliteDo.layer(this.ctx.storage.sql))),
    );
  }
}

export default {
  fetch() {
    return new Response("ok");
  },
} satisfies ExportedHandler<Env>;
