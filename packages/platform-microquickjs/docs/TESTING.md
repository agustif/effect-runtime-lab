# Testing

## Current test scope
- direct guest evaluation
- sync host exposure
- async host exposure
- deterministic fuel interruption
- scoped Effect layer provisioning
- compile-wrapper round trip
- export smoke

## Current verified commands
- `pnpm --filter @effect-experimental/platform-microquickjs build`
- `pnpm --filter @effect-experimental/platform-microquickjs test`
- `pnpm --filter @effect-experimental/platform-microquickjs check`

## Still needed
- a decision on whether this package should remain a runtime wrapper or grow full Effect platform services
- artifact and startup proofing if it becomes a first-class runtime track
