# Decisions

## D1. effect-smol vendor source
The vendor source of truth is `effect-ts/effect-smol`, pinned as a git submodule under `vendor/effect-smol`.

## D2. Effect version support
This lab focuses on Effect v4. We are not planning v3 compatibility work here.

## D3. Package boundaries
`platform-quickjs` and `platform-txiki` are sibling packages, not a mixed implementation.

Reason:
- same contract family
- different runtime substrates
- different deployment and dependency guarantees
- clearer docs, tests, and support boundaries

## D4. Documentation standard
Please avoid claiming a runtime or platform capability without either:
- package-local tests
- deterministic host-backed tests
- or explicit documentation that the feature is deferred/unsupported

## D5. Shared core extraction
We use a shared QuickJS-family core only for code that is genuinely shared between `platform-quickjs` and `platform-txiki`.

Host-specific glue, build logic, or deploy logic should stay out of the shared package.

Current extracted seam:
- `QuickJSRuntime` shared types in `@effect-experimental/platform-quickjs-shared`

## D6. Native QuickJS reintegration strategy
Archived native C/bootstrap work is reference material, not architecture authority.

Reusable native pieces can come forward if they survive a fresh review against:
- current `effect-smol` contracts
- current package boundaries
- current deterministic test expectations
