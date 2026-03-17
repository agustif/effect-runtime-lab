import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import * as ConformanceUpload from "@effect-experimental/runtime-conformance/UploadContract"
import * as TxikiHttpClient from "../../src/TxikiHttpClient.ts"

declare const __FIXTURE_BASE_URL__: string

const baseUrl = __FIXTURE_BASE_URL__

const main = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(`${baseUrl}/json`)
  const json = yield* response.json
  if (typeof json !== "object" || json === null || !("message" in json)) {
    throw new Error("json decode failed")
  }

  const binaryResponse = yield* client.get(`${baseUrl}/binary`)
  const bytes = new Uint8Array(yield* binaryResponse.arrayBuffer)
  if (bytes.length !== 6 || bytes[1] !== 255) {
    throw new Error("binary decode failed")
  }

  const cookieResponse = yield* client.get(`${baseUrl}/cookies`)
  if (!("a" in cookieResponse.cookies.cookies) || !("b" in cookieResponse.cookies.cookies)) {
    throw new Error("cookie handling failed")
  }

  const streamResponse = yield* client.get(`${baseUrl}/json`)
  const chunks = yield* Stream.runCollect(streamResponse.stream)
  const merged = new Uint8Array(Array.from(chunks).reduce((n, c) => n + c.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  if (!new TextDecoder().decode(merged).includes("txiki server")) {
    throw new Error("stream body failed")
  }

  const redirected = yield* client.pipe(HttpClient.followRedirects()).get(`${baseUrl}/redirect`)
  const redirectedJson = yield* redirected.json
  if (typeof redirectedJson !== "object" || redirectedJson === null || !("message" in redirectedJson)) {
    throw new Error("redirect handling failed")
  }

  const timed = yield* client.pipe(TxikiHttpClient.withOptions({ timeoutMs: 50 })).get(`${baseUrl}/slow`).pipe(
    Effect.flatMap((response) => response.text),
    Effect.match({
      onFailure: () => "failed" as const,
      onSuccess: () => "succeeded" as const
    })
  )
  if (timed !== "failed") {
    throw new Error("abort/timeout handling failed")
  }

  const invalid = yield* client.get(`${baseUrl}/invalid-json`).pipe(
    Effect.flatMap((response) => response.json),
    Effect.match({
      onFailure: () => "failed" as const,
      onSuccess: () => "succeeded" as const
    })
  )
  if (invalid !== "failed") {
    throw new Error("invalid json handling failed")
  }

  const head = yield* client.head(`${baseUrl}/head`).pipe(
    Effect.flatMap(HttpClientResponse.schemaJson(Schema.Struct({ status: Schema.Literal(200) })))
  )
  if (head.status !== 200) {
    throw new Error("head request handling failed")
  }

  const echoed = yield* HttpClientRequest.post(`${baseUrl}/echo-json`).pipe(
    HttpClientRequest.bodyJson({ value: "echo" }),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({ value: Schema.String })))
  )
  if (echoed.value !== "echo") {
    throw new Error("json echo handling failed")
  }

  yield* Effect.promise(() =>
    ConformanceUpload.verifyStrictUploadHttpClientLayer(TxikiHttpClient.layer, baseUrl)
  )
}).pipe(Effect.provide(TxikiHttpClient.layer))

Effect.runPromise(main).catch((error) => {
  console.error(error)
  throw error
})
