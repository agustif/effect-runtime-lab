import { afterEach, describe, it } from "vitest";
import * as ConformanceKeepAlive from "@effect-experimental/runtime-conformance/KeepAliveContract";
import * as TxikiRuntimeMain from "../src/TxikiRuntimeMain.ts";

const originalTjs = (globalThis as typeof globalThis & { tjs?: unknown }).tjs;

afterEach(() => {
  (globalThis as typeof globalThis & { tjs?: unknown }).tjs = originalTjs;
});

describe("TxikiRuntimeMain keepAlive", () => {
  it("matches the upstream keep-alive semantics", async () => {
    await ConformanceKeepAlive.verifyKeepAliveRuntimeMain(() => {
      (globalThis as typeof globalThis & { tjs?: unknown }).tjs = {
        addSignalListener() {},
        removeSignalListener() {},
        exit() {},
      };
      return {
        run(effect) {
          TxikiRuntimeMain.runMain(effect, { disableErrorReporting: true });
        },
      };
    });
  });
});
