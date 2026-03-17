# Branch policy

## Long-lived branches
- `main` — shared docs, shared harnesses, low-risk integration work
- `runtime/quickjs-core` — tiny deployable runtime track
- `runtime/txiki` — txiki adapter track backing `platform-txiki`
- `runtime/broad-runtime` — future Deno/Bun comparison track

## Short-lived branches
- `exp/<topic>` — bounded spikes only

## Guidelines
- avoid merging spikes directly into `main`
- treat spike results as tentative until rewritten cleanly onto the destination track
- archive dead-end spikes instead of letting them linger as semi-supported code
- keep vendor changes explicit and separated from package implementation when possible
