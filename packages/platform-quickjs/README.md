# @effect-experimental/platform-quickjs

This package is the clean bootstrap for the QuickJS Effect v4 adapter.

## Current status

This package is intentionally documentation-first.

It does **not** yet claim a supported runtime surface beyond being the designated home for the new implementation.

## Intended role

The eventual supported surface is expected to stay small and truthful:
- runtime bootstrap
- `Console`
- `Logger`
- `FileSystem`
- `Path`
- `HttpClient`

## Rules

- Effect v4 only
- no v3 compatibility work
- no REPL / AI / extension work in this package
- no release claim without authoritative tests
