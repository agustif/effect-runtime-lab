import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { upstreamCases } from "./manifest.js";
import { runCase } from "./runCase.js";
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import {
  awaitEmptyCase,
  interruptsFibersCase,
  joinCase,
  joinCompletesOnFailureWithRunningFibersCase,
  propagateInterruptionFalseCase,
  propagateInterruptionTrueCase,
  runtimeCase,
  sizeCase,
  sizeDropsAfterCompletionCase,
} from "./cases/FiberSetCases.js";
import {
  doneCompletesTakesCase,
  endEmitsAllItemsCase,
  endWithTakeCase,
  interruptAllowsDrainingCase,
  offerAllInterruptedCase,
  pollReturnsOptionCase,
  shutdownCompletesAwaitCase,
} from "./cases/QueueCases.js";
import {
  batchingPreservesRequestsCase,
  groupedResolverKeepsKeysSeparatedCase,
  preservesIdenticalRequestsCase,
  requestDelayServicesCase,
  requestsDontBreakInterruptionCase,
} from "./cases/RequestCases.js";
import {
  parallelFinalizationCase,
  sequentialFinalizersRunInReverseOrderCase,
} from "./cases/ScopeCases.js";
import {
  aggregateWithinDefectPropagationCase,
  aggregateWithinInterruptPropagationCase,
  callbackBackpressureCase,
  callbackCleanupCase,
  callbackHandlesDefectsCase,
  callbackHandlesErrorsCase,
  callbackSignalsEndCase,
} from "./cases/StreamCases.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const vendorRoot = resolve(repoRoot, "vendor/effect-smol/packages");

export interface CuratedCaseDefinition {
  readonly name: string;
  readonly run: () => Promise<void>;
}

const runCuratedEffect = <E>(effect: Effect.Effect<void, E, Scope.Scope | never>) =>
  Effect.runPromise(Effect.scoped(effect));

export const curatedCases: ReadonlyArray<CuratedCaseDefinition> = [
  { name: "scope.parallelFinalization", run: () => runCuratedEffect(parallelFinalizationCase()) },
  {
    name: "scope.sequentialFinalizersRunInReverseOrder",
    run: () => runCuratedEffect(sequentialFinalizersRunInReverseOrderCase()),
  },
  {
    name: "request.batchingPreservesRequests",
    run: () => runCuratedEffect(batchingPreservesRequestsCase()),
  },
  {
    name: "request.groupedResolverKeepsKeysSeparated",
    run: () => runCuratedEffect(groupedResolverKeepsKeysSeparatedCase()),
  },
  {
    name: "request.preservesIdenticalRequests",
    run: () => runCuratedEffect(preservesIdenticalRequestsCase()),
  },
  {
    name: "request.requestsDontBreakInterruption",
    run: () => runCuratedEffect(requestsDontBreakInterruptionCase()),
  },
  { name: "request.requestDelayServices", run: () => runCuratedEffect(requestDelayServicesCase()) },
  { name: "fiberset.interruptsFibers", run: () => runCuratedEffect(interruptsFibersCase()) },
  { name: "fiberset.awaitEmpty", run: () => runCuratedEffect(awaitEmptyCase()) },
  { name: "fiberset.join", run: () => runCuratedEffect(joinCase()) },
  {
    name: "fiberset.joinCompletesOnFailureWithRunningFibers",
    run: () => runCuratedEffect(joinCompletesOnFailureWithRunningFibersCase()),
  },
  { name: "fiberset.runtime", run: () => runCuratedEffect(runtimeCase()) },
  { name: "fiberset.size", run: () => runCuratedEffect(sizeCase()) },
  {
    name: "fiberset.sizeDropsAfterCompletion",
    run: () => runCuratedEffect(sizeDropsAfterCompletionCase()),
  },
  {
    name: "fiberset.propagateInterruptionFalse",
    run: () => runCuratedEffect(propagateInterruptionFalseCase()),
  },
  {
    name: "fiberset.propagateInterruptionTrue",
    run: () => runCuratedEffect(propagateInterruptionTrueCase()),
  },
  { name: "queue.doneCompletesTakes", run: () => runCuratedEffect(doneCompletesTakesCase()) },
  { name: "queue.endEmitsAllItems", run: () => runCuratedEffect(endEmitsAllItemsCase()) },
  { name: "queue.endWithTake", run: () => runCuratedEffect(endWithTakeCase()) },
  {
    name: "queue.interruptAllowsDraining",
    run: () => runCuratedEffect(interruptAllowsDrainingCase()),
  },
  { name: "queue.offerAllInterrupted", run: () => runCuratedEffect(offerAllInterruptedCase()) },
  { name: "queue.pollReturnsOption", run: () => runCuratedEffect(pollReturnsOptionCase()) },
  {
    name: "queue.shutdownCompletesAwait",
    run: () => runCuratedEffect(shutdownCompletesAwaitCase()),
  },
  { name: "stream.callbackCleanup", run: () => runCuratedEffect(callbackCleanupCase()) },
  { name: "stream.callbackBackpressure", run: () => runCuratedEffect(callbackBackpressureCase()) },
  { name: "stream.callbackSignalsEnd", run: () => runCuratedEffect(callbackSignalsEndCase()) },
  {
    name: "stream.callbackHandlesErrors",
    run: () => runCuratedEffect(callbackHandlesErrorsCase()),
  },
  {
    name: "stream.callbackHandlesDefects",
    run: () => runCuratedEffect(callbackHandlesDefectsCase()),
  },
  {
    name: "stream.aggregateWithinInterruptPropagation",
    run: () => runCuratedEffect(aggregateWithinInterruptPropagationCase()),
  },
  {
    name: "stream.aggregateWithinDefectPropagation",
    run: () => runCuratedEffect(aggregateWithinDefectPropagationCase()),
  },
];

const countTests = (relativePath: string) => {
  const absolute = resolve(vendorRoot, relativePath);
  return readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
    .map((entry) => entry.name);
};

export const collectInventory = () => {
  const effectTests = countTests("effect/test");
  const nodeSharedTests = countTests("platform-node-shared/test");
  const nodeTests = countTests("platform-node/test");

  return {
    effect: {
      total: effectTests.length,
      sample: effectTests.slice(0, 20),
    },
    platformNodeShared: {
      total: nodeSharedTests.length,
      tests: nodeSharedTests,
    },
    platformNode: {
      total: nodeTests.length,
      tests: nodeTests,
    },
    adopted: upstreamCases
      .filter((entry) => entry.category === "adopted")
      .map((entry) => ({
        source: basename(entry.source),
        reason: entry.reason,
      })),
    next: upstreamCases
      .filter((entry) => entry.category === "next")
      .map((entry) => ({
        source: basename(entry.source),
        reason: entry.reason,
      })),
    exploratory: upstreamCases
      .filter((entry) => entry.category === "exploratory")
      .map((entry) => ({
        source: basename(entry.source),
        reason: entry.reason,
      })),
  };
};

export const collectCurated = async () => {
  const results = [];
  for (const entry of curatedCases) {
    results.push(await runCase(entry.name, entry.run));
  }
  const taxonomy = {
    "runtime-bug": 0,
    "missing-platform-api": 0,
    "harness-mismatch": 0,
    unknown: 0,
  };
  for (const result of results) {
    if (result.failureType) {
      taxonomy[result.failureType] = taxonomy[result.failureType] + 1;
    }
  }
  return {
    total: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    taxonomy,
    results,
  };
};

export const writeEffectCoreSnapshot = async (
  outputPath = resolve(repoRoot, "docs/generated/effect-core-conformance.json"),
) => {
  mkdirSync(dirname(outputPath), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    inventory: collectInventory(),
    curated: await collectCurated(),
  };
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
};
