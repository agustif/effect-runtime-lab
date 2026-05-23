import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { CounterDurableObject } from "./worker.ts";

describe("WorkerdDurableObject", () => {
  it("reuses the runtime across durable object fetches", async () => {
    const id = env.COUNTER.newUniqueId();
    const stub = env.COUNTER.get(id);

    let response = await stub.fetch("https://example.com/increment?by=1");
    expect(await response.text()).toBe("1");

    response = await stub.fetch("https://example.com/increment?by=2");
    expect(await response.text()).toBe("3");

    response = await stub.fetch("https://example.com/builds");
    expect(await response.text()).toBe("1");

    const storedCount = await runInDurableObject(
      stub,
      async (instance: CounterDurableObject, state) => {
        expect(instance).toBeInstanceOf(CounterDurableObject);
        return await state.storage.get<number>("count");
      },
    );

    expect(storedCount).toBe(3);
  });
});
