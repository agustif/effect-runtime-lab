# Full Coverage & Fully Tested Product Plan (Runtime + Frontend v1)

**Summary**
- Goal: move all runtime surfaces in support matrices to **verified** across macOS + Linux + Windows, add a minimal frontend v1, and adopt the maximum practical test gate (curated + full upstream + additional stress/property tests).
- Outcome: all “partial/deferred” runtime gaps closed or explicitly re-scoped as non-goals, host-backed proofs on all three platforms, and a frontend that renders the generated JSON artifacts.

**Key Changes**
- **Shared conformance expansion**
  - Add richer file-handle helpers (append/seek/truncate combinations, close/invalid fd behavior, error mapping).
  - Add richer HTTP error-mapping assertions (DNS failure, connection refused, TLS error, timeout, malformed response).
  - Formalize package-level vs host-backed split in helper APIs and docs.
  - Add helper-specific usage examples for every contract helper.
- **QuickJS parity to “fully verified”**
  - Decide and implement sync/fsync semantics for native host; add host-backed tests.
  - Expand real-host file-handle edge cases; update support matrix to verified.
  - Expand watch semantics beyond create/update/remove (rename, rapid churn, directory depth); update watch policy from polling-only to verified.
  - Expand HTTP option-plumbing coverage (`follow`, `insecure`, `ca`, timeout ref) in both mock and prod lanes.
  - Deepen upload streaming/multipart depth (multi-file, large streams, missing content-length, malformed boundaries, error mapping).
- **Txiki parity to “fully verified”**
  - Expand watch semantics beyond create/update/remove, including rename and directory-level events.
  - Expand file-handle semantics (sync/datasync, seek combinations, truncate/append edge cases, permission errors).
  - Add ownership/permission edge-case tests; tighten error mapping.
  - Deepen upload streaming/multipart depth and redirect/error mapping coverage.
- **Benchmarks + platform proofs**
  - Add Linux and Windows artifact/dependency reporting to runtime-bench.
  - Add warm-start loops and cross-platform RSS collection.
  - Produce deterministic baseline snapshots and compare in CI.
- **Effect-core conformance scale-up**
  - Build a larger curated subset runner and failure taxonomy (runtime bug vs missing platform API vs harness mismatch).
  - Promote curated cases into release gates only after taxonomy is clean.
  - Add full upstream suite to nightly CI.
- **Frontend v1**
  - Scaffold `apps/site` (Vinext) with static routes and JSON-backed pages.
  - Consume `docs/generated/runtime-bench.json` and `docs/generated/effect-core-conformance.json`.
  - Provide runtime detail pages with support matrices + scorecards, plus a consolidated “truth surface” page.
- **Docs & scorecards**
  - Reconcile support matrices, scorecards, and release checkpoint to reflect verified status after each gap is closed.
  - Update release checkpoint to remove “still blocking” entries once proofs exist.

**Public API / Interface Changes**
- New shared conformance helpers and stricter host-backed variants in `runtime-conformance` (watch/file-handle/http error surfaces).
- Expanded runtime-bench JSON schema to include Windows/Linux proofs, warm-start metrics, and RSS evidence.
- Frontend app added under `apps/site` with routes and JSON data contract keyed to `docs/generated/*.json`.

**Test Plan (max practical coverage)**
1. PR gate (blocking): curated effect-core conformance + host-backed contract suites + runtime package tests + platform quickjs/txiki tests + targeted prod-lane smoke on macOS and Linux.
2. Nightly gate (blocking): full upstream effect-smol test suite + platform-node-shared suite + full host-backed suites on macOS/Linux/Windows.
3. Stress + property tests: randomized Path/FileSystem edge cases, multi-threaded HTTP uploads, watch churn, and large-stream multipart tests.
4. Benchmarks + proofs: artifacts, dependencies, startup, warm-start loops, RSS across macOS/Linux/Windows; snapshot comparison and regression alerts.

**Assumptions**
- “Fully finished product” means runtime parity for all supported surfaces plus a minimal frontend v1, not REPL/AI features.
- v3 compatibility remains out of scope.
- Windows support includes artifact/dependency/startup proofs and host-backed tests; if any platform cannot run a specific test, it must be documented and gated explicitly.
- “As many tests as humanely possible” is implemented as a hybrid gate: curated/host-backed for PRs plus nightly full upstream + stress/property tests.

