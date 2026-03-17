# Architecture

## Layers

`platform-txiki` follows the same package shape as `platform-quickjs`, but it is a distinct runtime adapter.

Current service modules:
- `TxikiConsole`
- `TxikiLogger`
- `TxikiPath`
- `TxikiStdio`
- `TxikiRuntimeMain`
- `TxikiHttpClient`
- `TxikiFileSystem`
- `TxikiServices`

## Host policy

This package aims to use txiki-native primitives where practical instead of mirroring the custom QuickJS host.

### Current host choices
- `TxikiHttpClient` uses fetch-backed behavior
- `TxikiStdio` uses txiki streams and resolves stdin lazily at stream evaluation time
- `TxikiRuntimeMain` uses txiki signal listeners and mirrors the shared runtime-main contract semantics
- `TxikiFileSystem` uses txiki async filesystem primitives directly

## Shared-core policy

Only QuickJS-family types live in `platform-quickjs-shared`. Runtime-specific host logic stays in this package.
