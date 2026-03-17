import { describe, expect, it } from "vitest"
import { curatedCases } from "../src/report.ts"
import { upstreamCases } from "../src/manifest.ts"

describe("effect-core-conformance pending upstream cases", () => {
  it("curates Scope.test.ts beyond the original parallel finalization seed", () => {
    expect(curatedCases.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "scope.parallelFinalization",
        "scope.sequentialFinalizersRunInReverseOrder"
      ])
    )
  })

  it("curates Request.test.ts batching and grouped resolver semantics", () => {
    expect(curatedCases.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "request.batchingPreservesRequests",
        "request.groupedResolverKeepsKeysSeparated"
      ])
    )
  })

  it("curates FiberSet.test.ts join, size, and propagateInterruption semantics", () => {
    expect(curatedCases.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "fiberset.join",
        "fiberset.size",
        "fiberset.propagateInterruptionTrue"
      ])
    )
  })

  it("curates Queue.test.ts shutdown and completed-take semantics", () => {
    expect(curatedCases.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "queue.doneCompletesTakes",
        "queue.shutdownCompletesAwait"
      ])
    )
  })

  it("curates Stream.test.ts interruption, defects, and richer callback semantics beyond the original subset", () => {
    expect(curatedCases.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "stream.callbackHandlesDefects",
        "stream.aggregateWithinInterruptPropagation",
        "stream.aggregateWithinDefectPropagation"
      ])
    )
  })

  it("tracks the classified exploratory runner in the manifest", () => {
    expect(curatedCases).toHaveLength(30)
    expect(upstreamCases.filter((entry) => entry.category === "adopted").map((entry) => entry.source)).toEqual(
      expect.arrayContaining([
        "vendor/effect-smol/packages/effect/test/Scope.test.ts",
        "vendor/effect-smol/packages/effect/test/Request.test.ts",
        "vendor/effect-smol/packages/effect/test/FiberSet.test.ts",
        "vendor/effect-smol/packages/effect/test/Queue.test.ts",
        "vendor/effect-smol/packages/effect/test/Stream.test.ts"
      ])
    )
  })
})
