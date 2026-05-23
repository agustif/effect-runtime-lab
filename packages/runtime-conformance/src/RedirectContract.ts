import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as HttpClient from "effect/unstable/http/HttpClient";

export const verifyRedirectHttpClientLayer = async (
  layer: Layer.Layer<HttpClient.HttpClient>,
  baseUrl: string,
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const response = yield* client.pipe(HttpClient.followRedirects()).get(`${baseUrl}/redirect`);
      const json = yield* response.json;
      if (typeof json !== "object" || json === null || !("message" in json)) {
        throw new Error(`redirect contract failed: ${JSON.stringify(json)}`);
      }
    }).pipe(Effect.provide(layer)),
  );
};
