---
type: "note"
---
# Implementation plan

## Goal

Build a real v1 slice for both `platform-quickjs` and `platform-txiki`, keep the shared seam narrow, and grow shared conformance, benchmark, and upstream-derived exploratory infrastructure alongside them.

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

## Immediate direction

1. expand shared conformance before claiming new parity

2. keep package-level and host-backed evidence separated

3. stage upstream-derived exploratory work instead of treating the full upstream suite as a release gate

## Detailed near-term execution

The concrete next ten batches are tracked in `NEXT_10_BATCHES.md`.

⠀