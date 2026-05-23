# Execution Tracks

## Track A: quickjs-core
Aim: a small native Effect host runtime with explicit guarantees.

Current focus:
- native host boundary
- package-level parity with upstream runtime shape
- deterministic host-backed validation
- artifact size and dependency surface

## Track B: platform-txiki
Aim: a small-but-richer host runtime with less custom host code.

Current focus:
- txiki-native service implementations
- a useful runtime surface with honest package boundaries
- leaning on standard web APIs instead of rebuilding them

## Track C: platform-microquickjs
Aim: a lightweight WASM wrapper/sandbox track for guest-code execution and host-object exposure.

Current focus:
- honest runtime-wrapper boundaries
- optional modern-JS compilation into the MicroQuickJS guest dialect
- determining whether this should remain a wrapper package or grow Effect platform services

## Track D: Cloudflare Workers platform adapters
Aim: execute Effect code inside the Workers model without pretending it is the same thing as a general host runtime.

Current focus:
- `platform-workerd` as the Workers execution-root adapter
- runtime-backed validation for `ExecutionContext`, loopback exports, RPC, Durable Objects, and Workflows
- narrow retained binding bridges for D1, KV, and Durable Object SQLite

## Track E: specialized labs
Aim: future exploration of LLRT, Javy, or other specialized execution forms.

Current status:
- planned only
