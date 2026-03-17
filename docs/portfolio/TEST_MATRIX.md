# Shared test matrix

We try to measure each runtime candidate against the same categories, even when implementations differ.

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
