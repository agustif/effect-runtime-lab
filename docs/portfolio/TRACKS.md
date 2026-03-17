# Runtime Tracks

## Track A: quickjs-core
Aim: a small native Effect runtime with explicit guarantees.

Current focus:
- native host boundary
- package-level parity with upstream runtime shape
- deterministic host-backed validation
- artifact size and dependency surface

## Track B: platform-txiki
Aim: a small-but-richer adapter with less custom host code.

Current focus:
- txiki-native service implementations
- a useful runtime surface with honest package boundaries
- leaning on standard web APIs instead of rebuilding them

## Track C: platform-microquickjs
Aim: a lightweight WASM sandbox track for guest-code execution and host-object exposure.

Current focus:
- honest runtime-wrapper boundaries
- optional modern-JS compilation into the MicroQuickJS guest dialect
- determining whether this should remain a wrapper package or grow Effect platform services

## Track D: specialized-labs
Aim: future exploration of workerd, LLRT, Javy, or other specialized runtime forms.

Current status:
- planned only
- not part of the current implementation slice
