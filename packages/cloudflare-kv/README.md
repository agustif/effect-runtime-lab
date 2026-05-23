# @effect-experimental/cloudflare-kv

Effect service and `KeyValueStore` bridge for Cloudflare KV bindings.

See `examples/worker.ts` for a complete worker.

```ts
import * as Effect from "effect/Effect"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import * as CloudflareKv from "@effect-experimental/cloudflare-kv"

const layer = CloudflareKv.layer(env.KV)

const program = Effect.gen(function*() {
  const store = yield* KeyValueStore.KeyValueStore
  const current = (yield* store.get("counter")) ?? "0"
  const next = String(Number(current) + 1)
  yield* store.set("counter", next)
  return next
}).pipe(Effect.provide(layer))
```
