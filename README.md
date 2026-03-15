# Effect Runtime Lab

This repository is the clean experimental runtime arm for Effect v4.

It starts fresh with:
- a pinned `effect-smol` vendor submodule
- a clean package tree under `packages/`
- explicit track separation between tiny-runtime, richer-runtime, benchmarking, and conformance work
- no in-repo mixing of REPL / AI / extension experiments into the platform core

## Status

This is a documentation-first bootstrap.

- `vendor/effect-smol` is pinned and read-only by default
- `packages/platform-quickjs` is a fresh bootstrap package, not a claimed production runtime yet
- `packages/runtime-conformance` and `packages/runtime-bench` define the shared discipline the runtime tracks must satisfy
- `packages/runtime-txiki` is the first richer-runtime exploration track

## Vendor

Pinned vendor source:
- repo: `https://github.com/Effect-TS/effect.git`
- submodule path: `vendor/effect-smol`
- current pinned commit: `9245bc59e`

## Start here

- `ARCHIVE.md`
- `docs/portfolio/README.md`
- `packages/platform-quickjs/README.md`
