# @effect-experimental/cloudflare-d1

Thin env/layer bridge around `@effect/sql-d1`.

See `examples/worker.ts` for a complete worker.

```ts
import * as Effect from "effect/Effect"
import * as D1 from "@effect/sql-d1"
import * as CloudflareD1 from "@effect-experimental/cloudflare-d1"

const layer = CloudflareD1.layer(env.DB)

const program = Effect.gen(function*() {
  const sql = yield* D1.D1Client.D1Client
  return yield* sql`SELECT 1 as ok`
}).pipe(Effect.provide(layer))
```
