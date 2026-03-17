import { describe, expect, it } from "vitest"
import * as ConformanceHttp from "@effect-experimental/runtime-conformance/HttpClientContract"
import * as ConformanceFixture from "@effect-experimental/runtime-conformance/HttpFixture"
import * as ConformanceRedirect from "@effect-experimental/runtime-conformance/RedirectContract"
import * as ConformanceUpload from "@effect-experimental/runtime-conformance/UploadContract"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as TxikiHttpClient from "../src/TxikiHttpClient.ts"

describe("TxikiHttpClient", () => {
  it("satisfies the shared basic http client contract", async () => {
    await ConformanceFixture.withHttpFixtureServer((baseUrl) =>
      ConformanceHttp.verifyBasicHttpClientLayer(TxikiHttpClient.layer, baseUrl)
    )
  })

  it("satisfies the shared advanced http client contract", async () => {
    await ConformanceFixture.withHttpFixtureServer((baseUrl) =>
      ConformanceHttp.verifyAdvancedHttpClientLayer(TxikiHttpClient.layer, baseUrl)
    )
  })

  it("satisfies the shared redirect contract", async () => {
    await ConformanceFixture.withHttpFixtureServer((baseUrl) =>
      ConformanceRedirect.verifyRedirectHttpClientLayer(TxikiHttpClient.layer, baseUrl)
    )
  })

  it("satisfies the shared http error mapping contract", async () => {
    await ConformanceFixture.withHttpFixtureServer((baseUrl) =>
      ConformanceHttp.verifyHttpErrorMappingLayer(
        TxikiHttpClient.layer,
        baseUrl,
        {
          configureTimeout: (client) => client.pipe(TxikiHttpClient.withOptions({ timeoutMs: 50 }))
        }
      )
    )
  })

  it("applies txiki-specific timeout options", async () => {
    await ConformanceFixture.withHttpFixtureServer(async (baseUrl) => {
      const outcome = await Effect.runPromise(
        Effect.gen(function* () {
          const client = yield* HttpClient.HttpClient
          const configured = client.pipe(
            TxikiHttpClient.withOptions({ timeoutMs: 50 })
          )
          return yield* configured.get(`${baseUrl}/slow`).pipe(
            Effect.flatMap((response) => response.text),
            Effect.match({
              onFailure: () => "failed" as const,
              onSuccess: () => "succeeded" as const
            })
          )
        }).pipe(
          Effect.provide(TxikiHttpClient.layer)
        )
      )
      expect(outcome).toBe("failed")
    })
  })

  it("satisfies the shared upload contract", async () => {
    await ConformanceFixture.withHttpFixtureServer((baseUrl) =>
      ConformanceUpload.verifyAdvancedUploadHttpClientLayer(TxikiHttpClient.layer, baseUrl)
    )
  })

  it("satisfies the strict multipart upload contract", async () => {
    await ConformanceFixture.withHttpFixtureServer((baseUrl) =>
      ConformanceUpload.verifyStrictUploadHttpClientLayer(TxikiHttpClient.layer, baseUrl)
    )
  })
})
