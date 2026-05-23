---
type: "note"
---
# Implementation plan

## Goal

Build a real v1 slice for both host-runtime tracks (`platform-quickjs` and `platform-txiki`), keep the shared seam narrow, and grow shared conformance, benchmark, and upstream-derived exploratory infrastructure alongside them. Treat the Workers slice as a separate platform-adapter track with its own truth surfaces and validation style.

## Current implemented slices

### `platform-quickjs`

* `QuickJSConsole`

* `QuickJSLogger`

* `QuickJSPath`

* `QuickJSStdio`

* `QuickJSRuntimeMain`

* `QuickJSFileSystem`

* `QuickJSHttpClient`

* `QuickJSServices`

* native host build and production-style test lane

* lazy host globals for `std`, `os`, and `http`

### `platform-txiki`

* `TxikiConsole`

* `TxikiLogger`

* `TxikiPath`

* `TxikiStdio`

* `TxikiRuntimeMain`

* `TxikiHttpClient`

* substantial `TxikiFileSystem` subset

* `TxikiServices`

* lazy stdin host lookup at stream evaluation time

### Shared support packages

* `runtime-conformance` for package-level and future host-backed shared contracts

* `runtime-bench` for artifact, dependency, and startup evidence

* `effect-core-conformance` for upstream-derived inventory and curated exploratory cases

### Cloudflare Workers platform-adapter track

* `platform-workerd` for Workers execution roots, invocation context, loopback exports, RPC, Durable Objects, and Workflows

* `cloudflare-d1`, `cloudflare-kv`, and `cloudflare-sqlite-do` as retained binding bridges with runtime-backed smoke tests

## Immediate direction

1. expand shared conformance before claiming new host-runtime parity

2. keep package-level and host-backed evidence separated

3. treat the Workers slice as a separate platform-adapter lane instead of forcing it through the same host-runtime matrix

4. stage upstream-derived exploratory work instead of treating the full upstream suite as a release gate

## Detailed near-term execution

The concrete next ten batches are tracked in `NEXT_10_BATCHES.md`.

⠀
