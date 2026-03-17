# @effect-experimental/platform-microquickjs

Experimental MicroQuickJS package for Effect v4.

## Current v1 slice

This package wraps the published `@ok.lol/mquickjs` runtime and currently provides:
- `MicroQuickJSRuntime` for preload, create, eval, expose, and dispose
- `MicroQuickJSEngine` as a scoped Effect service layer
- `MicroQuickJSCompiler` for optional modern-JS to ES3 compilation

## Verified in this repo
- package build, test, and typecheck pass
- guest evaluation works
- sync and async host object exposure works
- deterministic fuel interruption works
- the scoped Effect layer works
- the compile wrapper works with `@swc/core`

## Deferred or unsupported
- no native `FileSystem`, `HttpClient`, `Stdio`, or `RuntimeMain` adapter is claimed yet
- no production-style host lane exists yet
- no cross-platform artifact or startup proof surface exists yet

## Truth surfaces
- `TASKS.md`
- `docs/SUPPORT_MATRIX.md`
- `docs/TESTING.md`
- `docs/UNSUPPORTED.md`
