---
type: "note"
---
# @effect-experimental/platform-workerd

Experimental Cloudflare / workerd platform package for Effect v4.

## Current scope

This package establishes the worker-native runtime surface against the real Workers API:

* invocation context (`env`, request, `ctx.props`, `ctx.waitUntil()`, `ctx.passThroughOnException()`)

* explicit loopback exports / `ctx.exports` injection for RPC-aware fetch handlers

* Effect-first event handler helpers for `fetch`, `scheduled`, `queue`, `tail`, `trace`, and `test`

* entrypoint helpers for `WorkerEntrypoint` and `WorkflowEntrypoint` that take the real Workers `env` and `ctx`

* durable object runtimes with explicit lifetime management (`makeRuntime()` for actor roots, one-shot helpers that always dispose)

* scoped RPC capability leases and result envelopes

* unstable tmp filesystem helpers for the Workers `node:fs` surface

## Example: fetch handler

```ts
import * as Effect from "effect/Effect"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import * as WorkerdContext from "@effect-experimental/platform-workerd/WorkerdContext"
import * as WorkerdHandler from "@effect-experimental/platform-workerd/WorkerdHandler"

export default {
  fetch: WorkerdHandler.fetch(
    (_request) =>
      Effect.gen(function*() {
        const eventKind = yield* WorkerdContext.eventKind
        yield* WorkerdContext.passThroughOnException().pipe(Effect.orDie)
        yield* WorkerdContext.waitUntil(Effect.log(`handled ${eventKind}`)).pipe(Effect.orDie)
        return HttpServerResponse.text("ok")
      }),
    {
      exports: (ctx) => (ctx as ExecutionContext<unknown> & { exports?: unknown }).exports
    }
  )
}
```

## Example: worker entrypoint

```ts
import * as Effect from "effect/Effect"
import * as WorkerdContext from "@effect-experimental/platform-workerd/WorkerdContext"
import * as WorkerdEntrypoint from "@effect-experimental/platform-workerd/WorkerdEntrypoint"

export class CounterWorker extends WorkerEntrypoint<Env, { readonly counterId: string }> {
  increment() {
    return WorkerdEntrypoint.runResult(
      this.env,
      this.ctx,
      Effect.gen(function*() {
        const props = yield* WorkerdContext.props<{ readonly counterId: string }>()
        return { counterId: props.counterId, value: 1 }
      })
    )
  }
}
```

## Source pipeline

`platform-workerd` treats these as the source of truth, in order:

* checked-in `wrangler types` output at `source/generated/worker-configuration.d.ts`
* pinned `@cloudflare/workers-types`
* official Workers runtime docs
* `workerd` / Workers SDK runtime behavior when docs are ambiguous

Use:

* `pnpm --filter @effect-experimental/platform-workerd types:check`
* `pnpm --filter @effect-experimental/platform-workerd types:generate`

## Design rules

* workerd is treated as a capability runtime, not a host runtime

* Durable Objects are actor roots

* returned RPC targets and forwarded stubs are invocation-scoped leases

* domain failures cross RPC boundaries as explicit result envelopes

* transport failures use tagged Effect errors

## Truth surfaces

* `docs/ARCHITECTURE.md`

* `docs/SUPPORT_MATRIX.md`

* `docs/UNSUPPORTED.md`

* `source/runtime-source.json`

* `source/generated/worker-configuration.d.ts`

⠀
