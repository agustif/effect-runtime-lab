import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as WorkerdContext from "../src/WorkerdContext.ts";
import * as WorkerdHandler from "../src/WorkerdHandler.ts";

describe("WorkerdHandler", () => {
  it("uses a real Workers execution context for passThroughOnException and waitUntil", async () => {
    let waited = false;
    const ctx = createExecutionContext() as ExecutionContext<Record<string, never>>;

    const handler = WorkerdHandler.fetch<Record<string, never>, Record<string, never>, never>(
      () =>
        Effect.gen(function* () {
          yield* WorkerdContext.passThroughOnException().pipe(Effect.orDie);
          yield* WorkerdContext.waitUntil(
            Effect.sync(() => {
              waited = true;
            }),
          ).pipe(Effect.orDie);
          return HttpServerResponse.text("ok");
        }),
    );

    const response = await handler(new Request("https://example.com"), {}, ctx);

    expect(await response.text()).toBe("ok");

    await waitOnExecutionContext(ctx);

    expect(waited).toBe(true);
  });
});
