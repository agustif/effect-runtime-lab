export interface UpstreamCase {
  readonly source: string;
  readonly category: "adopted" | "next" | "exploratory";
  readonly reason: string;
}

export const upstreamCases: ReadonlyArray<UpstreamCase> = [
  {
    source: "vendor/effect-smol/packages/effect/test/EffectKeepAlive.test.ts",
    category: "adopted",
    reason: "ported into shared KeepAliveContract plus runtime-main tests",
  },
  {
    source: "vendor/effect-smol/packages/platform-node-shared/test/NodeFileSystem.test.ts",
    category: "adopted",
    reason:
      "temp, copy, truncate, cursor, append, and basic file-handle semantics are ported into shared filesystem contracts",
  },
  {
    source: "vendor/effect-smol/packages/effect/test/HttpClient.test.ts",
    category: "adopted",
    reason: "stream and timeout or abort-style semantics are ported into shared HTTP contracts",
  },
  {
    source: "vendor/effect-smol/packages/platform-node/test/NodeHttpClient.test.ts",
    category: "adopted",
    reason: "redirect-follow semantics are ported into a shared local redirect contract",
  },
  {
    source: "vendor/effect-smol/packages/effect/test/Request.test.ts",
    category: "adopted",
    reason:
      "interruption, request-service propagation, batching, duplicate preservation, and grouped-resolver semantics are covered by the curated runner",
  },
  {
    source: "vendor/effect-smol/packages/effect/test/FiberSet.test.ts",
    category: "adopted",
    reason:
      "interrupt, awaitEmpty, join, runtime, size, and propagateInterruption semantics are covered by the curated runner",
  },
  {
    source: "vendor/effect-smol/packages/effect/test/Queue.test.ts",
    category: "adopted",
    reason:
      "interrupt, offerAll interruption, done, end, poll, and shutdown semantics are covered by the curated runner",
  },
  {
    source: "vendor/effect-smol/packages/effect/test/Stream.test.ts",
    category: "adopted",
    reason:
      "callback cleanup, backpressure, end, error, defect, and aggregateWithin propagation semantics are covered by the curated runner",
  },
  {
    source: "vendor/effect-smol/packages/effect/test/Scope.test.ts",
    category: "adopted",
    reason:
      "parallel finalization and reverse-order sequential finalizer semantics are covered by the curated runner",
  },
  {
    source: "vendor/effect-smol/packages/platform-node/test/NodeHttpClient.test.ts",
    category: "next",
    reason:
      "still the main source for richer local HTTP parity such as schema decoding, HEAD, and broader streaming semantics",
  },
  {
    source: "vendor/effect-smol/packages/effect/test/Effect.test.ts",
    category: "exploratory",
    reason:
      "larger runtime-sensitive effect semantics still need a curated import strategy beyond the current focused runner",
  },
];
