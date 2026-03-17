# @effect-experimental/effect-core-conformance

Exploratory package for importing and inventorying upstream `effect-smol` runtime-sensitive tests.

## Purpose

This package does not attempt to run the full upstream suite under every runtime yet.

It exists to:
- track which upstream tests have already been adopted into shared conformance helpers
- identify the next high-signal upstream tests to import
- run a curated exploratory lane of upstream-inspired runtime-sensitive behaviors
- provide an executable inventory of the current vendor test corpus

## Current commands

- `pnpm --filter @effect-experimental/effect-core-conformance build`
- `pnpm --filter @effect-experimental/effect-core-conformance check`
- `pnpm --filter @effect-experimental/effect-core-conformance inventory`
- `pnpm --filter @effect-experimental/effect-core-conformance curated`
- `pnpm --filter @effect-experimental/effect-core-conformance test` - skipped placeholder tests plus the 30-case curated runner
- `pnpm --filter @effect-experimental/effect-core-conformance snapshot`

## Generated outputs
- `docs/generated/effect-core-conformance.json`

## Current curated lane

The current curated runner covers 30 runtime-sensitive cases derived from upstream Effect tests:
- `scope.parallelFinalization`
- `scope.sequentialFinalizersRunInReverseOrder`
- `request.batchingPreservesRequests`
- `request.groupedResolverKeepsKeysSeparated`
- `request.preservesIdenticalRequests`
- `request.requestsDontBreakInterruption`
- `request.requestDelayServices`
- `fiberset.interruptsFibers`
- `fiberset.awaitEmpty`
- `fiberset.join`
- `fiberset.joinCompletesOnFailureWithRunningFibers`
- `fiberset.runtime`
- `fiberset.size`
- `fiberset.sizeDropsAfterCompletion`
- `fiberset.propagateInterruptionFalse`
- `fiberset.propagateInterruptionTrue`
- `queue.doneCompletesTakes`
- `queue.endEmitsAllItems`
- `queue.endWithTake`
- `queue.interruptAllowsDraining`
- `queue.offerAllInterrupted`
- `queue.pollReturnsOption`
- `queue.shutdownCompletesAwait`
- `stream.callbackCleanup`
- `stream.callbackBackpressure`
- `stream.callbackSignalsEnd`
- `stream.callbackHandlesErrors`
- `stream.callbackHandlesDefects`
- `stream.aggregateWithinInterruptPropagation`
- `stream.aggregateWithinDefectPropagation`

Curated failures are classified into a lightweight taxonomy (`runtime-bug`, `missing-platform-api`, `harness-mismatch`, `unknown`) in the snapshot output and the package `test` command, so the default test gate can distinguish harness drift from runtime regressions.

Skipped tests in this package keep the missing exploratory cases visible in test output.
