import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as ConformanceStdio from "@effect-experimental/runtime-conformance/StdioContract";
import * as TxikiStdio from "../src/TxikiStdio.ts";

const writes: Array<Uint8Array> = [];
const originalTjs = (globalThis as typeof globalThis & { tjs?: unknown }).tjs;

const makeWritable = () =>
  new WritableStream<Uint8Array>({
    write(chunk) {
      writes.push(chunk);
    },
  });

const makeReadable = (chunks: ReadonlyArray<Uint8Array>) => {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index++]!);
    },
  });
};

beforeEach(() => {
  writes.length = 0;
  (globalThis as typeof globalThis & { tjs?: unknown }).tjs = {
    args: ["tjs", "script.ts", "x"],
    stdin: makeReadable([new TextEncoder().encode("input")]),
    stdout: makeWritable(),
    stderr: makeWritable(),
  };
});

afterEach(() => {
  (globalThis as typeof globalThis & { tjs?: unknown }).tjs = originalTjs;
});

describe("TxikiStdio", () => {
  it("satisfies the shared stdio contract against txiki streams", async () => {
    await ConformanceStdio.verifyBasicStdioLayer(TxikiStdio.layer, {
      expectedArgs: ["script.ts", "x"],
      stdoutChunk: "hello stdout",
      stderrChunk: "hello stderr",
      expectedStdinText: ["input"],
    });

    expect(new TextDecoder().decode(writes[0]!)).toBe("hello stdout");
    expect(new TextDecoder().decode(writes[1]!)).toBe("hello stderr");
  });
});
