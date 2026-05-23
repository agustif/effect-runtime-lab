# Release readiness checkpoint

This is the current, best-effort release-readiness snapshot for runtime-lab. It is intentionally conservative and distinguishes host runtimes from Workers platform adapters.

## QuickJS

### Verified now
- package build, test, and typecheck
- native host build
- host-backed prod lane
- root `pnpm test` gate includes the curated 30-case `effect-core-conformance` runner and currently passes with a clean taxonomy
- package-level `Path`, `Stdio`, `RuntimeMain`, `KeepAlive`
- package-level `FileSystem` basic CRUD, temp, copy, stream/sink, chmod/link, and advanced file-handle semantics (seek/append/truncate) with host-backed sync/error mapping
- watch create/update/remove plus rename/nested/churn semantics (polling-based, verified in prod lane)
- package-level `HttpClient` basic, advanced timeout/abort-style, redirect-follow, upload, strict multipart boundary checks, and transport error mapping
- prod-lane `HttpClient` smoke for redirects, timeout/abort, invalid JSON, HEAD/status, JSON echo, byte upload, stream-body upload, multipart, and error mapping
- prod-lane `FileSystem` checks for closed-handle and permission-denied behavior
- runtime-bench startup + warm-start evidence on macOS

### Still blocking an honest v1 claim
- no explicit Linux deployment proof yet
- full recursive and edge-case filesystem matrix beyond current coverage is still partial
- broader Windows/Linux host proofs (bench, dependencies, RSS) are still missing

## Txiki

### Verified now
- package build, test, and typecheck
- root `pnpm test` gate includes the curated 30-case `effect-core-conformance` runner and currently passes with a clean taxonomy
- package-level `Path`, `Stdio`, `RuntimeMain`, `KeepAlive`
- package-level `FileSystem` basic CRUD, temp, copy, stream/sink, chmod/link, and advanced file-handle semantics (seek/append/truncate) with sync/error mapping checks
- watch create/update/remove plus rename/nested/churn semantics
- package-level `HttpClient` basic, advanced timeout/abort-style, redirect-follow, upload, strict multipart boundary checks, and transport error mapping
- local runtime artifact, compiled sample artifact, dependency evidence, startup, and warm-start evidence on macOS
- a txiki-native prod lane passes for runtime, path, filesystem, HTTP, and watch slices

### Still blocking an honest v1 claim
- richer file-handle parity (datasync policy, permission/ownership edge cases) still incomplete
- broader deployment guarantees beyond current local evidence are still incomplete
- richer redirect edge cases and full transport matrix still incomplete

## Shared blockers
- Linux/Windows benchmarks and host-backed proofs are still missing
- nightly full upstream suite + stress/property gates are not yet wired

## Cloudflare Workers platform-adapter track

### Verified now
- `platform-workerd` build, typecheck, checked-in `wrangler types` fixture validation, and runtime-backed Worker-pool tests pass
- `cloudflare-d1`, `cloudflare-kv`, and `cloudflare-sqlite-do` each have runtime-backed smoke tests against real Workers bindings
- Workers invocation context, loopback exports, RPC leases, Durable Objects, Workflows, and tmp-fs claims are validated against the Workers runtime instead of local mock contracts

### Still blocking broader claims
- this is not yet a full host-runtime parity target and should not be described that way
- the retained Cloudflare bridges are intentionally narrow and do not imply broad binding coverage
- no broader support matrix exists yet beyond the currently tested Workers surfaces

## Current release criteria

For the current repo, a runtime is only considered locally release-ready when all of the following are true:
- package `build`, `check`, and `test` pass
- the curated `effect-core-conformance` lane is green with a clean taxonomy
- `runtime-bench` snapshots are refreshed and linked from the scorecard
- the support matrix, testing doc, unsupported doc, and scorecard are synchronized in the same change
- any host-backed claim is backed by a deterministic host lane on the same platform
