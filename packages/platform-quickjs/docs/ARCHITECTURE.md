# Architecture

## Layers

`platform-quickjs` is split into three layers:

1. TypeScript service modules (`src/*.ts`)
2. native host and bootstrap files (`src/prod`, `native`, `scripts`)
3. shared runtime-family types (`@effect-experimental/platform-quickjs-shared`)

## TypeScript service layer

Current service modules:
- `QuickJSConsole`
- `QuickJSLogger`
- `QuickJSPath`
- `QuickJSStdio`
- `QuickJSRuntimeMain`
- `QuickJSFileSystem`
- `QuickJSHttpClient`
- `QuickJSServices`

These modules are the Effect-facing contract. The goal is to keep them honest even when the native host is incomplete.

## Native host layer

Current native/host files:
- `src/prod/main.c`
- `src/prod/polyfills.js`
- `native/quickjs-http.c`
- `native/quickjs-libc-extra.c`
- `scripts/build-host.mjs`
- `scripts/bundle-prod.mjs`
- `scripts/test-production.mjs`

### Bootstrap policy

The native host exposes `std`, `os`, and `http` lazily:
- `std` is resolved on first access
- `os` is resolved on first access
- `http` is resolved on first access, and curl global initialization is deferred until that first access

This keeps bootstrap smaller and avoids paying HTTP setup cost when code only needs non-HTTP services.

### Host extension policy

Current v1 host extensions:
- `os.ftruncate` and `os.fsync` for host-backed file-handle semantics
- `os.chmod` and `os.link` for filesystem parity beyond the stock libc surface
- `http.request` for the custom transport bridge used by `QuickJSHttpClient`
- `os.memoryUsage` and `os.cpuUsage` for benchmark-oriented observability

Deferred until later:
- stronger `chown` guarantees across platforms and distributions
- a non-polling native watch backend
- broader packaging or installer-specific distribution helpers

## Current platform guarantees

- macOS: locally verified in this repo via package build/test/check, native host build, production-style host-backed lane, and `runtime-bench` artifact/startup snapshots
- Linux: source and benchmark helpers exist, but this repo does not yet include a matching local host-proof capture
- Windows: no host-proof or packaging guarantee is claimed yet

## Shared-core policy

Only the QuickJS-family runtime types currently live in `platform-quickjs-shared`. Please keep host-specific or build-specific code out of the shared package.
