import { afterEach, describe, it } from "vitest";
import * as ConformanceKeepAlive from "@effect-experimental/runtime-conformance/KeepAliveContract";
import * as QuickJSRuntimeMain from "../src/QuickJSRuntimeMain.ts";

const originalProcess = globalThis.process;

afterEach(() => {
  globalThis.process = originalProcess;
});

describe("QuickJSRuntimeMain keepAlive", () => {
  it("matches the upstream keep-alive semantics", async () => {
    await ConformanceKeepAlive.verifyKeepAliveRuntimeMain(() => {
      globalThis.process = {
        on() {},
        removeListener() {},
        exit() {},
      } as typeof process;
      return {
        run(effect) {
          QuickJSRuntimeMain.runMain(effect, { disableErrorReporting: true });
        },
      };
    });
  });
});
