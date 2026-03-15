# Runtime Tracks

## Track A: quickjs-core
Purpose: smallest native Effect runtime with explicit guarantees.

Focus:
- artifact size
- startup time
- dependency surface
- deterministic host contract

## Track B: txiki-platform
Purpose: richer small-runtime platform with much less custom host code.

Focus:
- leverage
- broader host capabilities
- acceptable deployability
- lower maintenance burden than a fully custom host

## Track C: broad-runtime
Purpose: compare against pragmatic runtimes such as Deno or Bun.

Focus:
- shipping speed
- executable story
- DX and built-in platform surface

## Track D: specialized-labs
Purpose: evaluate specialized runtime forms such as workerd, LLRT, or Javy.

Focus:
- edge/capability experiments
- serverless cold-start experiments
- hermetic component experiments
