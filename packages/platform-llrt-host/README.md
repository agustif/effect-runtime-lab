---
type: note
collab_reviewed: true
---

# LLRT Custom Host Prototype

`@effect-experimental/platform-llrt-host` is the isolated lab package for making LLRT a first-class ti-code runtime without relying on stock LLRT's partial Node compatibility.

The package is intentionally small:

- `src/host-api.ts` defines the native host ABI the custom LLRT binary must expose.
- `src/install.ts` installs the JS facade onto `globalThis`.
- `src/process.ts` provides `process.stdin/stdout/stderr`, TTY/raw-mode hooks, argv/env, and signal `on`/`off`.
- `src/timers.ts` wraps timers so returned handles expose `ref()` / `unref()`.
- `src/child-process.ts` provides `child_process` / `node:child_process` module facades over the custom host spawn primitive.
- `src/packaging.ts` records the package and binary integration points ti-code can consume later.

This does not build the Rust/C LLRT binary yet. The blocker is native host embedding: the binary must provide the `TiLlrtHostDriver` surface from `src/host-api.ts` before ti-code can claim TUI and `ChildProcessSpawner` parity.

## Local verification

```bash
pnpm --filter @effect-experimental/platform-llrt-host build
pnpm --filter @effect-experimental/platform-llrt-host test
```

## ti-code integration sketch

1. Build a custom LLRT binary that injects a `TiLlrtHostDriver`.
2. Run `installTiLlrtHost(driver)` before ti-code's portable CLI entrypoint.
3. Teach `packages/platform-llrt` in pi-effect to prefer `require("node:child_process")` / `require("child_process")` when `globalThis.__ti_llrt_host` is present.
4. Package the custom binary beside the LLRT entry bundle as `ti-code-llrt-host`.
