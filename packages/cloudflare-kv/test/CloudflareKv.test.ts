import { env as runtimeEnv } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";
import * as CloudflareKv from "../src/index.ts";

describe("CloudflareKv", () => {
  it("bridges a Workers KV namespace into Effect KeyValueStore", async () => {
    const env = runtimeEnv as Cloudflare.Env & { readonly KV: KVNamespace };
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore;
        yield* store.set("counter", "1");
        const text = yield* store.get("counter");
        const bytes = yield* store.getUint8Array("counter");
        return {
          bytes: bytes === undefined ? undefined : new TextDecoder().decode(bytes),
          text,
        };
      }).pipe(Effect.provide(CloudflareKv.layer(env.KV))),
    );

    expect(result).toEqual({
      bytes: "1",
      text: "1",
    });
  });
});
