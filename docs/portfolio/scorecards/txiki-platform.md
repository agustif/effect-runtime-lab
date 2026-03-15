# txiki-platform Scorecard

## Current evidence
- local clone and build succeeded on macOS
- `tjs` binary size: 5.8M
- compiled hello executable size: 5.8M
- macOS dependencies: `libffi`, `libSystem`, `libc++`
- minimal `effect-smol` v4 smoke succeeded when bundling `packages/effect/src/Effect.ts`

## Open questions
- full Effect v4 semantic fit
- deployability on Linux and macOS beyond the hello executable
- dependency/runtime story for larger bundled apps
