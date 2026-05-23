import { exports as loopbackExports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("WorkerdContext", () => {
  it("exposes loopback exports and props inside fetch handlers", async () => {
    const worker = loopbackExports as {
      readonly default: {
        readonly fetch: (request: Request) => Promise<Response>;
      };
    };

    const response = await worker.default.fetch(new Request("https://example.com/context"));

    expect(await response.json()).toEqual({
      hasCounterWorker: true,
      props: {},
    });
  });
});
