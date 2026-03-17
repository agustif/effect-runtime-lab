# Support matrix

Legend:
- `verified` - implemented and covered by current tests in this repo
- `partial` - implemented in a meaningful subset but not yet a full platform claim
- `deferred` - intentionally not claimed yet

## Runtime wrapper
- preload / create / dispose - `verified`
- guest evaluation - `verified`
- sync host exposure - `verified`
- async host exposure - `verified`
- deterministic fuel interruption - `verified`
- scoped Effect layer - `verified`

## Compiler
- Node compile entrypoint via `@swc/core` - `verified`
- compiled modern-JS guest execution - `verified`

## Effect platform services
- `FileSystem` - `deferred`
- `HttpClient` - `deferred`
- `Stdio` - `deferred`
- `RuntimeMain` - `deferred`

## Evidence
- package build/test/check - `verified`
- artifact and startup proofs - `deferred`
