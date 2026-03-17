# @effect-experimental/platform-quickjs

Experimental QuickJS platform package for Effect v4.

## Current v1 slice

This package follows the upstream runtime-package structure and currently provides:
- `QuickJSConsole`
- `QuickJSLogger`
- `QuickJSPath`
- `QuickJSStdio`
- `QuickJSRuntimeMain`
- `QuickJSFileSystem`
- `QuickJSHttpClient`
- `QuickJSServices`
- shared runtime-family types via `@effect-experimental/platform-quickjs-shared`

## Verified in this repo
- package build, test, and typecheck pass
- native QuickJS host build passes
- production-style host-backed lane passes
- package-level support is verified for:
  - `Path`
  - `Stdio`
  - `RuntimeMain`
  - keep-alive semantics derived from upstream Effect tests
  - `FileSystem` basic CRUD
  - `FileSystem` temp primitives
  - `FileSystem` copy semantics
  - `FileSystem` basic file-handle semantics
  - `FileSystem` stream and sink adapters
  - `FileSystem` hard-link and chmod support
  - `FileSystem` richer watch semantics (rename, nested path, churn)
  - `HttpClient` basic deterministic fixture behavior
  - `HttpClient` timeout/abort-style advanced behavior
  - `HttpClient` local redirect-follow behavior
  - `HttpClient` byte-upload, stream-body upload, and multipart-form upload behavior
  - `HttpClient` transport error mapping plus option plumbing (`follow`, `insecure`, `ca`, timeout)
- the native host installs `std`, `os`, and `http` lazily instead of eagerly importing all three at bootstrap time

## Partial or deferred
- richer real-host file-handle semantics are still partial
- full recursive filesystem edge-case coverage is still partial
- the remaining redirect / abort / cancellation parity matrix is still partial
- cross-platform deployability guarantees are still deferred

## Truth surfaces
- `TASKS.md`
- `V1_PLAN.md`
- `docs/SUPPORT_MATRIX.md`
- `docs/TESTING.md`
- `docs/UNSUPPORTED.md`
