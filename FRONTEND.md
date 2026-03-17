---
type: "note"
---
# Frontend Plan

We expect a small, static frontend later. Its job is to make the repo easier to read and to surface evidence without forcing people through every Markdown file.

## Goals

* keep the repo readable to humans

* surface verified benchmark and artifact evidence directly from repo outputs

* show QuickJS and txiki samples side by side

* make `verified`, `partial`, `deferred`, and skipped-test status easy to see

* keep the build simple and static-first

## Proposed stack

* a small Vinext app in this repo, likely under `apps/site`

* static content generated from Markdown and machine-readable outputs

* no backend dependency for v1

* minimal routing:

  * `/`

  * `/runtime/quickjs`

  * `/runtime/txiki`

  * `/benchmarks`

  * `/conformance`

  * `/roadmap`

## Content sources

* root `README.md`

* `docs/portfolio/*`

* package `README.md`, `TASKS.md`, `SUPPORT_MATRIX.md`, `TESTING.md`, `UNSUPPORTED.md`

* `runtime-bench` outputs

* `effect-core-conformance` inventory and curated runner outputs

## Build/data model

* generate machine-readable outputs for:

  * artifact size and dependencies

  * startup measurements

  * curated upstream-conformance results

* have the frontend consume those JSON files

* avoid scraping console output at request time

## Sections

### Home

* short explanation of the project

* two runtime cards: QuickJS and txiki

* latest artifact and startup numbers

### Runtime detail pages

* support matrix rendered clearly

* latest known gaps

* code samples for setup and usage

* links back to source docs and tests

### Benchmarks

* artifact size

* dependencies

* startup timing

* later RSS and Linux proofs

### Conformance

* shared contract coverage

* skipped tests for deferred work

* curated upstream-derived lane status

### Roadmap

* next 10 batches

* current blockers

## Constraints

* keep the UI documentation-first

* avoid claims not backed by the repo

* generate pages from source-of-truth files where possible

* keep it optional so runtime work stays unblocked

## Next sensible moves

1. machine-readable JSON outputs now exist under `docs/generated/`

2. choose the Vinext setup path and app directory

3. scaffold the site shell with static routes only

4. wire benchmark and conformance JSON into simple pages

5. wire package support matrices and task docs into runtime detail pages

6. render release-readiness and skipped-test surfaces so deferred work stays visible

7. add side-by-side QuickJS and txiki artifact/startup tables from the generated JSON

## Status

`apps/site` now contains a minimal Vinext scaffold with static routes wired to `docs/generated/*.json` and markdown docs. To run it locally:

```sh
pnpm --filter @effect-experimental/runtime-site dev
```

⠀