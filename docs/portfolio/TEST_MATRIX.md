# Shared Test Matrix

Every runtime candidate should be measured against the same matrix.

## Contract categories
- runtime bootstrap
- timers / process / stdio
- FileSystem
- Path
- HttpClient
- Effect v4 semantic core

## Runtime scenarios
- basic Effect execution
- interruption and cancellation
- resource scope / cleanup
- local deterministic HTTP JSON
- local deterministic HTTP binary
- repeated headers / cookies
- path normalization / formatting edge cases
- file read/write/stat/remove

## Artifact metrics
- binary size
- runtime dependencies
- startup latency
- RSS under smoke load
- packaging/distribution shape
