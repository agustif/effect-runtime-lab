# Shared test matrix

We try to measure each host-runtime candidate against the same categories, even when implementations differ.

Workers platform adapters use a different matrix and should not be forced into the host-runtime parity shape.

## Contract categories
- runtime bootstrap / `runMain`
- timers / process / stdio
- FileSystem
- Path
- HttpClient
- Effect v4 semantic core

## Package-level contract scenarios
- basic Effect execution
- `runMain` success cleanup without forced `exit(0)`
- `runMain` failure exit-code propagation
- `runMain` interrupt exit-code propagation
- stdio args / stdout / stderr / stdin
- file read / write / stat / rename / remove
- path normalization / formatting edge cases
- local deterministic HTTP JSON / binary / cookies / response streams

## Host-backed or artifact scenarios
- native host boot and prod bundle execution
- local deterministic HTTP fixture server
- binary size
- runtime dependencies
- startup latency
- RSS under smoke load
- packaging/distribution shape

## Current executable helpers
- `packages/runtime-conformance/src/PathContract.ts`
- `packages/runtime-conformance/src/FileSystemContract.ts`
- `packages/runtime-conformance/src/HttpClientContract.ts`
- `packages/runtime-conformance/src/StdioContract.ts`
- `packages/runtime-conformance/src/RuntimeMainContract.ts`
- `packages/runtime-conformance/src/HttpFixture.ts`
- `packages/runtime-bench/src/artifacts.ts`
- `packages/runtime-bench/src/startup.ts`

## Workers platform-adapter categories
- invocation context (`props`, `waitUntil`, `passThroughOnException`)
- loopback exports / `ctx.exports`
- WorkerEntrypoint RPC
- Durable Object lifecycle and runtime reuse
- Workflow entrypoint execution
- binding-bridge smoke tests for D1, KV, and SQLite Durable Objects
