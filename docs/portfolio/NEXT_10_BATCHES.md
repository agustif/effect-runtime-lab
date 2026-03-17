# Next 10 batches

This is a working plan for the next ten implementation batches from the current repo state. It is meant to be adjusted as evidence changes.

## Batch 1 - QuickJS watch design and first host policy
- [x] define the current QuickJS watch story
  - [x] decide that native-host watch remains deferred for the current v1 slice
  - [x] document that decision in support matrices and unsupported docs
- [ ] decide whether that defer remains acceptable at the release-checkpoint stage
- Exit check:
  - one clear QuickJS watch policy is documented and reflected in tests/docs

## Batch 2 - Shared richer watch conformance
- [x] extend `runtime-conformance` watch helpers beyond a single helper alias
  - [x] support ordered watch-event sequences
  - [x] have txiki consume the richer sequence helper
- [x] add create/update/remove coverage where a runtime can truthfully support it
- [ ] consider whether path-normalization rules belong in the shared helper
- Exit check:
  - shared watch helpers exist and at least one runtime consumes the richer version

## Batch 3 - QuickJS real-host file-handle depth
- [x] tighten `platform-quickjs` real-host file-handle behavior
  - [x] append semantics under the native host
  - [x] truncate cursor behavior under the native host
  - [x] temp primitives exercised under the native host
- [ ] decide final sync/fsync policy for the native host
- Exit check:
  - host-backed QuickJS file-handle semantics are explicitly tested or explicitly deferred

## Batch 4 - Txiki richer file-handle semantics
- [x] deepen txiki file-handle behavior
  - [x] append semantics
  - [x] cursor clamp after truncate
- [ ] deepen file-handle semantics further
  - [ ] sync/datasync policy
  - [ ] more seek combinations
- Exit check:
  - txiki file-handle support matrix moves from partial to a better-defined state

## Batch 5 - Shared HTTP richer error and option coverage
- [x] extend shared HTTP helpers
  - [x] local redirect-follow helper
  - [x] invalid JSON decode-error coverage
  - [x] HEAD/status coverage
  - [x] JSON echo roundtrip coverage
- [x] add runtime-specific option checks where the option surfaces differ
  - [x] QuickJS host option plumbing check
  - [x] txiki timeout option behavior check
- [ ] deepen richer transport/decode error coverage further
- Exit check:
  - both runtime packages consume richer shared HTTP helpers and at least one runtime-specific option check

## Batch 6 - Upload and multipart groundwork
- [x] define the initial upload and multipart groundwork
  - [x] deterministic fixture routes for byte uploads
  - [x] deterministic fixture routes for multipart-form uploads
  - [x] skipped tests make the missing semantics visible
- [ ] turn groundwork into shared conformance helpers
- [ ] decide per-runtime v1 policy for uploads and multipart
- Exit check:
  - upload and multipart are no longer invisible; they are implemented or explicitly deferred with fixture groundwork in place

## Batch 7 - QuickJS upload or explicit defer
- [x] implement or explicitly defer QuickJS upload support
  - [x] request-body streaming evaluation
  - [x] multipart feasibility check
  - [x] explicit support boundaries documented for what remains deeper than the current contract
- Exit check:
  - QuickJS upload status is no longer ambiguous

## Batch 8 - Txiki artifact and dependency proofing
- [x] produce txiki artifacts from this repo
  - [x] executable size capture
  - [x] dependency capture
  - [x] startup capture via `runtime-bench`
- Exit check:
  - `runtime-bench` reports both QuickJS and txiki tracks side by side

## Batch 9 - Effect-core curated expansion
- [x] expand `effect-core-conformance` curated runner beyond the initial set
  - [x] `Request.test.ts`-derived cases
  - [x] more `FiberSet.test.ts`-derived cases
  - [x] more `Queue.test.ts`-derived cases
  - [x] more `Stream.test.ts`-derived cases
- [x] continue expanding the curated runner beyond the earlier baseline
- [ ] continue expanding the curated runner further
  - [x] additional `Scope` cases
  - [x] richer `Request` batching/grouping cases
  - [x] richer `FiberSet` join/size/propagateInterruption cases
  - [x] richer `Queue` shutdown and completed-take cases
  - [x] larger `Stream` interruption/defect subsets
- Exit check:
  - curated upstream-derived runner covers materially more than the initial six cases

## Batch 10 - Release-readiness checkpoint
- [ ] reconcile support matrices, scorecards, and benchmark evidence
  - [x] update `quickjs-core` scorecard
  - [x] update `platform-txiki` scorecard
  - [x] classify remaining blockers into v1 blockers vs post-v1 backlog in the release checkpoint
- Exit check:
  - one explicit checkpoint document describing what would still block an honest v1 claim for each runtime
