import { describe, it } from "vitest";
import * as Conformance from "@effect-experimental/runtime-conformance/PathContract";
import * as TxikiPath from "../src/TxikiPath.ts";

describe("TxikiPath", () => {
  it("satisfies the shared basic path contract", async () => {
    await Conformance.verifyBasicPathLayer(TxikiPath.layer);
  });
});
