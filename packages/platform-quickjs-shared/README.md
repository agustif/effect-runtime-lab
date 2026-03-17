# @effect-experimental/platform-quickjs-shared

Shared core for QuickJS-family runtime adapters.

## Current contents
- shared runtime-family `QuickJSRuntime` types

## Extraction policy
Only move functionality here when both runtime adapters show the same Effect-facing behavior.

### Allowed candidates
- shared runtime-family types
- common path/body/response helpers only if semantics converge fully
- common error mapping helpers only if both adapters expose the same guarantees

### Explicit non-goals
- native host bootstrap code
- build scripts and artifact logic
- runtime-specific globals or environment detection
- txiki-specific or QuickJS-host-specific side effects

## Task tracker

See `TASKS.md` for the extraction guardrails.
