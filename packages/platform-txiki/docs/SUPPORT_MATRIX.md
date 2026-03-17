# Support matrix

This matrix stays close to the current evidence.

Legend:
- `verified` - implemented and covered by current build or test evidence in this repo
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
- local executable, dependency, and startup proof lane in this repo - `verified`
- txiki-native production-style runtime/path/filesystem/HTTP/watch lane - `verified`
- broader deployment proofing beyond the current local evidence - `deferred`

## Console / Logger / Stdio
- `TxikiConsole` - `verified`
- `TxikiLogger` - `verified`
- shared stdio contract for args/stdout/stderr/stdin - `verified`
- stdin behavior beyond current package-level assumptions - `partial`

## Path
- basic shared path contract - `verified`
- broader edge-case parity matrix - `partial`

## FileSystem
- access / exists - `verified`
- stat - `verified`
- readFile / writeFile - `verified`
- stream / sink - `verified`
- readDirectory - `verified`
- makeDirectory / remove / rename / realPath / open / temp / copy / link / symlink / readLink / utimes / truncate / chmod - `verified` for the current package-level subset
- chown - `partial`
- temp contract - `verified`
- copy contract - `verified`
- basic file-handle contract - `verified`
- basic watch create/update/remove contract - `verified`
- host-backed file-handle checks (sync, closed-handle errors, permission mapping) - `verified`
- richer file-handle parity - `partial`
- watch support beyond the current create/update/remove contract (rename, nested path, churn) - `verified`
- permissions and ownership edge cases - `partial`
- full recursive/remove/temp edge-case matrix under real txiki - `verified`

## HttpClient
- fetch-backed adapter - `verified`
- shared basic HTTP client contract - `verified`
- shared timeout/abort-style advanced HTTP contract - `verified`
- shared redirect-follow contract - `verified`
- basic byte-upload, stream-body upload, and multipart-form upload contract - `verified`
- upload streaming and multipart depth (multi-file, large stream, strict boundary) - `verified`
- transport error mapping (DNS, connection refused, TLS, malformed, timeout) - `verified`
- txiki-native host-backed HTTP lane - `verified`
- richer redirect edge cases and error mapping - `partial`

## Explicit non-goals
- treating txiki as the same runtime as the custom QuickJS host - `deferred`
- v3 compatibility - `deferred`
