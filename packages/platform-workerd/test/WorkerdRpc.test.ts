import { RpcStub, RpcTarget, exports as loopbackExports } from "cloudflare:workers";
import { createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as WorkerdContext from "../src/WorkerdContext.ts";
import * as WorkerdRpc from "../src/WorkerdRpc.ts";
import type { CounterProps } from "./worker.ts";

describe("WorkerdRpc", () => {
  it("duplicates and disposes actual loopback RPC stubs", async () => {
    class CounterTarget extends RpcTarget {
      increment(by = 1) {
        return {
          counterId: "counter-lease",
          incrementedBy: by,
        };
      }
    }

    const stub = new RpcStub(new CounterTarget());
    const lease = WorkerdRpc.fromStub(stub);
    const duplicate = await Effect.runPromise(lease.dup);

    const first = await Effect.runPromise(
      lease.use((raw) => Effect.promise(() => raw.increment(1))),
    );
    const second = await Effect.runPromise(
      duplicate.use((raw) => Effect.promise(() => raw.increment(3))),
    );

    await Effect.runPromise(duplicate.dispose);

    expect(first).toEqual({
      counterId: "counter-lease",
      incrementedBy: 1,
    });
    expect(second).toEqual({
      counterId: "counter-lease",
      incrementedBy: 3,
    });
  });

  it("selects loopback exports through the WorkerdContext service", async () => {
    const ctx = createExecutionContext() as ExecutionContext<Record<string, never>>;
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

    const lease = await Effect.runPromise(
      WorkerdRpc.fromExports((value) =>
        (value as typeof worker).CounterWorker({ props: { counterId: "counter-exports" } }),
      ).pipe(
        Effect.provide(
          WorkerdContext.layer({
            env: {},
            ctx,
            eventKind: "fetch",
            exports: worker,
          }),
        ),
      ),
    );

    const result = await Effect.runPromise(
      lease.use((stub) => Effect.promise(() => stub.increment(5))),
    );

    expect(result).toEqual({
      _tag: "Success",
      value: {
        counterId: "counter-exports",
        incrementedBy: 5,
      },
    });
  });
});
