# Shared core policy

## Decision

We plan to have a shared core similar in spirit to `platform-node-shared`, but only for the QuickJS-family adapters and only once the shared seam is real.

That means:
- yes to a shared package
- no to prematurely moving host-specific code into it

## What belongs in shared core
Only code that is both:
- Effect-facing rather than host-bootstrap-facing
- truly shared by at least two adapters

Good candidates:
- shared runtime-family types
- common path helpers if both adapters converge on them
- common platform error mapping helpers
- common response/body adaptation helpers if both adapters genuinely share the same model

Current extracted seam:
- `@effect-experimental/platform-quickjs-shared/src/QuickJSRuntime.ts`

## What does not belong in shared core
- custom QuickJS host globals
- txiki-native runtime glue
- build pipelines
- binary packaging logic
- host lifecycle and transport initialization

## Rule of extraction

Please avoid speculative extraction. Pull shared code only after:
1. both adapters have concrete implementations
2. duplication is real
3. the shared API can be named without leaking runtime-specific assumptions
