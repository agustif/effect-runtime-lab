# @effect-experimental/platform-cloudflare

Experimental Cloudflare Workers platform package for Effect v4.

This package is the public Cloudflare-facing umbrella for the Workers track. It is intentionally
not a host-runtime package in the same class as `platform-quickjs` or `platform-txiki`.

## Current scope

This package re-exports the Workers-native execution surfaces:

- `CloudflareContext`
- `CloudflareHandler`
- `CloudflareEntrypoint`
- `CloudflareDurableObject`
- `CloudflareRpc`
- `CloudflareWorkflow`
- `CloudflareServices`
- `CloudflareKv`

Unstable helpers are exposed under:

- `@effect-experimental/platform-cloudflare/unstable/CloudflareTmpFileSystem`
- `@effect-experimental/platform-cloudflare/unstable/CloudflareTmpPath`

## Product boundary

This package should be read as the local prototype for an upstream-style
`@effect/platform-cloudflare`.

It does **not** claim:

- `RuntimeMain`
- `Stdio` / `Terminal`
- general `FileSystem`
- signal or process lifecycle
- host-runtime parity with Node, QuickJS, or txiki

Instead, it targets the Cloudflare Workers execution model directly:

- request/event roots
- `ExecutionContext`
- loopback exports / RPC
- Durable Objects
- Workflows
- KV as a platform capability

Database integrations should stay in their own capability families:

- `@effect/sql-d1`
- `@effect/sql-sqlite-do`

## Current implementation note

Today this umbrella is backed by the narrower engine-named implementation package
`@effect-experimental/platform-workerd`. New consumer-facing docs and examples should prefer
`@effect-experimental/platform-cloudflare`.
