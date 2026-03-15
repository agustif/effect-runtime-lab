# Branch Policy

## Long-lived branches
- `main`: shared docs, shared harnesses, low-risk infra
- `runtime/quickjs-core`: tiny deployable runtime track
- `runtime/txiki`: txiki.js adapter track
- `runtime/broad-runtime`: Deno or Bun comparison track

## Short-lived branches
- `exp/<topic>`: bounded spikes only

Rules:
- no spike merges directly into `main`
- no spike result counts unless it is rewritten cleanly onto the destination track
- archive dead-end spikes instead of letting them linger as semi-supported code
