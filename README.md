---
type: "note"
---
# Effect Runtime Lab

Effect Runtime Lab is a small experimental space for Effect v4 execution targets. We use it to explore host runtimes, wrapper runtimes, and platform adapters while keeping vendor code, runtime implementations, tooling, and release claims separate.

## Current state

This repo includes working code. What looks solid today:

* `docs/generated/` contains machine-readable benchmark and conformance snapshots for frontend or CI use

* `vendor/effect-smol` is pinned as the source of truth for Effect v4 contracts

Host-runtime tracks:

* `packages/platform-quickjs` builds, tests, typechecks, and ships a native QuickJS host with expanded file-handle, watch, upload, redirect-follow, and keep-alive coverage

* `packages/platform-txiki` builds, tests, and provides a sibling adapter on txiki.js with expanded file-handle, watch, upload, redirect-follow, and keep-alive coverage

Wrapper track:

* `packages/platform-microquickjs` builds, tests, and provides a MicroQuickJS WASM runtime wrapper plus compiler support for guest-code execution

Cloudflare Workers platform-adapter track:

* `packages/platform-workerd` builds, typechecks, and now runs runtime-backed Workers tests against the actual `workerd` / Workers surface for invocation context, entrypoints, durable objects, workflows, RPC leases, and unstable tmp-fs support

* `packages/platform-quickjs-shared` holds the shared seam between adapters

* `packages/cloudflare-d1`, `packages/cloudflare-kv`, and `packages/cloudflare-sqlite-do` are the retained Cloudflare binding bridges because they add real Effect value and have runtime-backed smoke coverage

Shared infrastructure:

* `packages/runtime-conformance` provides executable helpers for `Path`, `FileSystem`, `Copy`, `FileHandle`, `Temp`, `Watch`, `Redirect`, `HttpClient`, `Upload`, `Stdio`, `RuntimeMain`, and `KeepAlive`

* `packages/runtime-bench` provides artifact inspection, dependency evidence, startup timing, and warm-start loops

* `packages/effect-core-conformance` inventories upstream tests and runs a curated, runtime-sensitive exploratory lane with failure taxonomy

* `apps/site` surfaces the generated JSON evidence via a minimal Vinext frontend

What we are not claiming yet:

* full upstream parity for either host-runtime package

* cross-platform artifact guarantees beyond current local evidence

* complete shared conformance coverage across all targeted services

* full watcher, multipart, and error semantics across all remaining runtime surfaces

## Taxonomy

This repo now uses three different categories on purpose:

* host runtimes: `platform-quickjs`, `platform-txiki`

* wrapper/sandbox runtimes: `platform-microquickjs`

* platform adapters: `platform-workerd`, `cloudflare-d1`, `cloudflare-kv`, `cloudflare-sqlite-do`

`platform-workerd` is not treated as the same kind of runtime as QuickJS or txiki. By Effect standards here, it is a Workers platform adapter and execution-root integration layer, not a general host runtime with the same contract expectations as `FileSystem` + `Path` + `Stdio` + `RuntimeMain`.

## Repository layout

* `vendor/effect-smol` - pinned upstream vendor source, read-only by default

* `vendor/quickjs-ng` - vendored engine source for the custom QuickJS host track

* `packages/platform-quickjs` - custom QuickJS host-runtime adapter

* `packages/platform-txiki` - txiki.js host-runtime adapter

* `packages/platform-microquickjs` - MicroQuickJS WASM runtime wrapper

* `packages/platform-workerd` - Cloudflare Workers platform adapter core

* `packages/platform-quickjs-shared` - QuickJS-family shared core for the host-runtime tracks only

* `packages/cloudflare-d1` - D1 binding bridge around `@effect/sql-d1`

* `packages/cloudflare-kv` - KV binding bridge around `KeyValueStore`

* `packages/cloudflare-sqlite-do` - Durable Object SQLite bridge around `@effect/sql-sqlite-do`

* `packages/runtime-conformance` - shared conformance helpers and contract checks

* `packages/runtime-bench` - artifact and startup measurement helpers

* `packages/effect-core-conformance` - upstream-derived conformance inventory and staged exploratory runner

* `apps/site` - minimal static frontend for runtime evidence

* `docs/portfolio` - track strategy, decisions, scorecards, and policy

* `TASKS.md` - repo-level execution tracker with epics and nested subtasks

## Start here

If you are new to the repo, these are the most useful entry points (roughly in order):

* `ARCHIVE.md`

* `TASKS.md`

* `FRONTEND.md`

* `docs/portfolio/README.md`

* `docs/portfolio/TASKS.md`

* `docs/portfolio/IMPLEMENTATION_PLAN.md`

* `docs/portfolio/RELEASE_READINESS_CHECKPOINT.md`

* `docs/portfolio/NEXT_10_BATCHES.md`

* `docs/portfolio/DECISIONS.md`

* `docs/portfolio/SHARED_CORE_POLICY.md`

* `packages/platform-quickjs/README.md`

* `packages/platform-txiki/README.md`

* `packages/effect-core-conformance/README.md`

## Useful commands

Core validation:

* `pnpm build` - build `platform-quickjs`, `platform-txiki`, and `platform-microquickjs`

* `pnpm test` - run package-level tests for the host/wrapper runtime packages plus the curated effect-core lane

* `pnpm check` - typecheck the host/wrapper runtime packages

* `pnpm check:cloudflare` - typecheck `platform-workerd` plus the retained Cloudflare binding bridges

* `pnpm test:cloudflare` - run the runtime-backed Workers test suites for `platform-workerd`, D1, KV, and SQLite Durable Objects

* `pnpm types:cloudflare` - verify the checked-in `wrangler types` fixture for `platform-workerd`

* `pnpm types:cloudflare:generate` - regenerate the checked-in `wrangler types` fixture

Expanded validation:

* `pnpm build:all` - build adapters plus conformance, benchmark, and exploratory packages

* `pnpm test:prod` - run the QuickJS and txiki production-style host-runtime lanes

* `pnpm bench:artifacts` - print current artifact and dependency information

* `pnpm bench:startup` - print basic startup and RSS-style evidence for available runtime binaries

* `pnpm conformance:inventory` - print the upstream test inventory and staged adoption manifest

* `pnpm --filter @effect-experimental/effect-core-conformance curated` - run the current curated exploratory lane

Vendor management:

* `pnpm vendor:status`

* `pnpm vendor:update`

## Planning and truth surfaces

* `TASKS.md` - repo-level execution tracker

* `docs/portfolio/TASKS.md` - portfolio-level governance tracker

* `docs/portfolio/NEXT_10_BATCHES.md` - concrete plan for the next ten batches

* `packages/platform-quickjs/docs/SUPPORT_MATRIX.md`

* `packages/platform-txiki/docs/SUPPORT_MATRIX.md`

* `packages/platform-workerd/examples/`

* `packages/cloudflare-kv/examples/`

* `packages/cloudflare-d1/examples/`

⠀