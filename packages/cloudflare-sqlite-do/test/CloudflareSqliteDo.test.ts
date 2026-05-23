import { env as runtimeEnv } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
describe("CloudflareSqliteDo", () => {
  it("queries durable object SQLite storage through the vendored Effect client", async () => {
    const env = runtimeEnv as Cloudflare.Env & {
      readonly SQLITE_DB: DurableObjectNamespace;
    };
    const id = env.SQLITE_DB.newUniqueId();
    const stub = env.SQLITE_DB.get(id);

    const response = await stub.fetch("https://example.com");
    expect(await response.json()).toEqual([{ id: 1, name: "Ada" }]);

    const databaseSize = await runInDurableObject(stub, async (_instance, state) => {
      return state.storage.sql.databaseSize;
    });

    expect(databaseSize).toBeGreaterThan(0);
  });
});
