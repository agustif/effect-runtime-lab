# @effect-experimental/platform-txiki

Experimental txiki.js platform package for Effect v4.

## Current v1 slice

This package follows the same upstream-style runtime-package structure as `platform-quickjs` and currently provides:
- `TxikiConsole`
- `TxikiLogger`
- `TxikiPath`
- `TxikiStdio`
- `TxikiRuntimeMain`
- `TxikiHttpClient`
- `TxikiFileSystem`
- `TxikiServices`
- shared runtime-family types via `@effect-experimental/platform-quickjs-shared`

## Verified in this repo
- package build, test, and typecheck pass
- a txiki-native prod lane now passes for runtime, path, filesystem, HTTP, and watch slices
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
  - `FileSystem` link and chmod support
  - `FileSystem` richer watch semantics (rename, nested path, churn)
  - `HttpClient` basic deterministic fixture behavior
  - `HttpClient` timeout/abort-style advanced behavior
  - `HttpClient` local redirect-follow behavior
  - `HttpClient` byte-upload, stream-body upload, and multipart-form upload behavior
  - `HttpClient` transport error mapping
- `stdin` is resolved lazily at stream evaluation time instead of module import time

## Partial or deferred
- richer file-handle semantics are still partial
- the remaining redirect / abort / cancellation parity matrix is still partial
- Linux and broader deployment proofing are still deferred

## Local artifact evidence now present
- local txiki runtime artifact: `.tmp-runtime-evals/txikijs/build/tjs`
- local txiki compiled sample: `.tmp-runtime-evals/txikijs/hello-compiled`
- current size and dependency evidence is available through `pnpm bench:artifacts`
- current startup and warm-start memory evidence is available through `pnpm bench:startup` and `pnpm data:refresh`

## Truth surfaces
- `TASKS.md`
- `V1_PLAN.md`
- `docs/SUPPORT_MATRIX.md`
- `docs/TESTING.md`
- `docs/UNSUPPORTED.md`
