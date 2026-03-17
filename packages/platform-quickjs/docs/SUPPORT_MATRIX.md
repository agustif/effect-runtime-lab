# Support matrix

This matrix stays close to the current evidence.

Legend:
- `verified` - implemented and covered by current build, test, or prod-lane evidence in this repo
- `partial` - implemented in a meaningful subset, but not yet covered to parity depth
- `deferred` - intentionally not yet claimed as supported

## Core runtime package shape
- namespace exports - `verified`
- shared runtime-family types - `verified`
- service composition layer - `verified`

## Runtime and bootstrap
- package-level `runMain` helper - `verified`
- shared runtime-main contract - `verified`
- shared keep-alive contract - `verified`
- native host build - `verified`
- production-style host-backed lane - `verified`
- lazy `std` / `os` / `http` globals in the native host - `verified`
- documented Linux/macOS deployability guarantees - `deferred`

## Console / Logger / Stdio
- `QuickJSConsole` - `verified`
- `QuickJSLogger` - `verified`
- shared stdio contract for args/stdout/stderr/stdin - `verified`
- stdin semantics beyond current package-level and smoke coverage - `partial`

## Path
- basic shared path contract - `verified`
- broader edge-case parity matrix - `partial`

## FileSystem
- access / exists - `verified`
- stat - `verified`
- readFile / writeFile - `verified`
- stream / sink - `verified`
- readDirectory - `verified`
- temp primitives - `verified` at package-contract depth
- copy and copyFile - `verified` at package-contract depth
- chmod / link - `verified`
- chown - `partial`
- basic file-handle operations (`open`, cursor, append, truncate) - `verified` at package-contract depth
- makeDirectory / remove / rename / realPath / readLink / symlink / truncate / utimes - `verified`
- host-backed file-handle checks (sync, closed-handle errors, permission mapping) - `verified`
- full file-handle parity under the real host - `partial`
- basic watch create/update/remove contract - `verified`
- richer watch semantics (rename, nested path, churn) - `verified`
- full recursive and edge-case behavior matrix - `partial`

## HttpClient
- native host integration exists - `verified`
- package-level basic HTTP contract - `verified`
- package-level timeout/abort-style advanced HTTP contract - `verified`
- shared redirect-follow contract - `verified`
- basic byte-upload, stream-body upload, and multipart-form upload contract - `verified`
- prod-lane JSON / binary / cookies / response-stream smoke - `verified`
- prod-lane redirect and timeout/abort smoke - `verified`
- explicit option-plumbing coverage (`follow`, `insecure`, `ca`, timeout ref) - `partial`
- upload streaming and multipart depth (multi-file, large stream, strict boundary) - `verified`
- transport error mapping (DNS, connection refused, TLS, malformed, timeout) - `verified`
- full error / redirect / abort parity matrix - `partial`

## Explicit non-goals
- REPL / AI / extensions - `deferred`
- v3 compatibility - `deferred`
