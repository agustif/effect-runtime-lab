import { describe, it } from "vitest";
import * as Conformance from "@effect-experimental/runtime-conformance/PathContract";
import * as QuickJSPath from "../src/QuickJSPath.ts";

describe("QuickJSPath", () => {
  it("satisfies the shared basic path contract", async () => {
    await Conformance.verifyBasicPathLayer(QuickJSPath.layer);
  });
});
