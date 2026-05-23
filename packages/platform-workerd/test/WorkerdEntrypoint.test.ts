import { exports as loopbackExports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type * as WorkerdRpc from "../src/WorkerdRpc.ts";
import type { CounterProps } from "./worker.ts";

describe("WorkerdEntrypoint", () => {
  it("runs WorkerEntrypoint methods over real loopback RPC bindings", async () => {
    const worker = loopbackExports as {
      readonly CounterWorker: (options: {
        readonly props: CounterProps;
      }) => {
        readonly increment: (
          by?: number,
        ) => Promise<
          WorkerdRpc.WorkerdResult<
            {
              readonly counterId: string;
              readonly incrementedBy: number;
            },
            never
          >
        >;
      };
    };

    const result = await worker.CounterWorker({ props: { counterId: "counter-1" } }).increment(2);

    expect(result).toEqual({
      _tag: "Success",
      value: {
        counterId: "counter-1",
        incrementedBy: 2,
      },
    });
  });
});
