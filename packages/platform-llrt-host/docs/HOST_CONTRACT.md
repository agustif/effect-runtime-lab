---
type: note
collab_reviewed: true
---

# LLRT Host Contract

The custom LLRT host must inject a JS object that satisfies `TiLlrtHostDriver`.

## Required surfaces

- `stdio.stdin`, `stdio.stdout`, `stdio.stderr`
  - `onData(listener)` and `offData(listener)` for `process.stdin.on("data")`.
  - `write(chunk)` for stdout and stderr.
  - `isTTY()`, `setRawMode(enabled)`, `columns()`, and `rows()` where supported.
- `signals.on(signal, listener)` and `signals.off(signal, listener)`
  - Required for `process.on("SIGINT")`, `process.off("SIGINT")`, `SIGTERM`, and resize/control signals.
- Timers
  - Native `setTimeout` / `setInterval` handles should expose `ref()` / `unref()`.
  - Until native handles do, `installTimerRefFacade` wraps numeric handles and unwraps them for clear functions.
- `childProcess.spawn(command, options)`
  - Must return pid, stdin/stdout/stderr pipes, `exit` promise, `kill(signal)`, and optional `ref()` / `unref()`.
  - This is the minimum primitive needed to back Effect's `ChildProcessSpawner`.

## Current blockers

1. Stock LLRT does not expose an embeddable child process primitive.
2. Stock LLRT process streams are not enough for raw-mode TUI input parity.
3. Signal registration has to be owned by the host binary; a JS-only shim cannot receive OS signals reliably.
4. Packaging needs a custom binary artifact, not only a JS package.

## Next commands

```bash
pnpm --filter @effect-experimental/platform-llrt-host build
pnpm --filter @effect-experimental/platform-llrt-host test
rg -n "LlrtChildProcessSpawner|LlrtTerminalLayer|process.stdin|node:child_process" /Users/af/pi-effect/packages/platform-llrt /Users/af/pi-effect/apps/cli/src/runtime
```
