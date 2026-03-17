import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"

const expectHttpFailure = <A>(
  effect: Effect.Effect<A, HttpClientError.HttpClientError>,
  expected: ReadonlyArray<HttpClientError.HttpClientError["reason"]["_tag"]>,
  label: string
) =>
  Effect.match(effect, {
    onSuccess: () => {
      throw new Error(`${label} expected failure, but it succeeded`)
    },
    onFailure: (error) => {
      if (!HttpClientError.isHttpClientError(error)) {
        throw new Error(`${label} expected HttpClientError, got ${String(error)}`)
      }
      const tag = error.reason._tag
      if (!expected.includes(tag)) {
        throw new Error(`${label} expected ${expected.join(" | ")}, got ${tag}`)
      }
    }
  })

export const verifyBasicHttpClientLayer = async (
  layer: Layer.Layer<HttpClient.HttpClient>,
  baseUrl: string
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient

      const response = yield* client.get(`${baseUrl}/json`)
      if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`)
      const json = yield* response.json
      if (typeof json !== "object" || json === null || !("message" in json)) {
        throw new Error(`unexpected JSON payload: ${JSON.stringify(json)}`)
      }

      const binaryResponse = yield* client.get(`${baseUrl}/binary`)
      const bytes = new Uint8Array(yield* binaryResponse.arrayBuffer)
      if (bytes.length !== 6 || bytes[1] !== 255) throw new Error("binary contract failed")

      const cookieResponse = yield* client.get(`${baseUrl}/cookies`)
      if (!("a" in cookieResponse.cookies.cookies) || !("b" in cookieResponse.cookies.cookies)) {
        throw new Error("cookie contract failed")
      }

      const streamResponse = yield* client.get(`${baseUrl}/json`)
      const chunks = yield* Stream.runCollect(streamResponse.stream)
      const size = Array.from(chunks).reduce((total, chunk) => total + chunk.length, 0)
      const merged = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      if (!new TextDecoder().decode(merged).includes("runtime fixture")) {
        throw new Error("stream body contract failed")
      }
    }).pipe(Effect.provide(layer))
  )
}

export const verifyAdvancedHttpClientLayer = async (
  layer: Layer.Layer<HttpClient.HttpClient>,
  baseUrl: string
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient

      const slowResult = yield* client.get(`${baseUrl}/slow`).pipe(
        Effect.flatMap((response) => response.text),
        Effect.timeout(10),
        Effect.match({
          onFailure: (error) => ({ _tag: (error as { _tag?: string })._tag ?? "Failure" }) as const,
          onSuccess: () => ({ _tag: "Success" }) as const
        })
      )

      if (slowResult._tag === "Success") {
        throw new Error(`abort/timeout contract failed: ${JSON.stringify(slowResult)}`)
      }

      const invalidJson = yield* client.get(`${baseUrl}/invalid-json`).pipe(
        Effect.flatMap((response) => response.json),
        Effect.match({
          onFailure: () => "failed" as const,
          onSuccess: () => "succeeded" as const
        })
      )
      if (invalidJson !== "failed") {
        throw new Error("decode error contract failed")
      }

      const head = yield* client.head(`${baseUrl}/head`).pipe(
        Effect.flatMap(
          HttpClientResponse.schemaJson(Schema.Struct({ status: Schema.Literal(200) }))
        )
      )
      if (head.status !== 200) {
        throw new Error(`head contract failed: ${JSON.stringify(head)}`)
      }

      const echoed = yield* HttpClientRequest.post(`${baseUrl}/echo-json`).pipe(
        HttpClientRequest.bodyJson({ value: "echo" }),
        Effect.flatMap((request) => client.execute(request)),
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({ value: Schema.String })))
      )
      if (echoed.value !== "echo") {
        throw new Error(`json echo contract failed: ${JSON.stringify(echoed)}`)
      }
    }).pipe(Effect.provide(layer))
  )
}

export interface HttpErrorMappingOptions {
  readonly dnsUrl?: string
  readonly connectionRefusedUrl?: string
  readonly tlsUrl?: string
  readonly malformedUrl?: string
  readonly timeoutUrl?: string
  readonly configureTimeout?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
}

const normalizeHttps = (baseUrl: string) => baseUrl.replace(/^http:/, "https:")

export const verifyHttpErrorMappingLayer = async (
  layer: Layer.Layer<HttpClient.HttpClient>,
  baseUrl: string,
  options: HttpErrorMappingOptions = {}
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient

      const configuredClient = options.configureTimeout ? options.configureTimeout(client) : client
      const dnsUrl = options.dnsUrl ?? "http://does-not-exist.invalid"
      const refusedUrl = options.connectionRefusedUrl ?? "http://127.0.0.1:1"
      const tlsUrl = options.tlsUrl ?? `${normalizeHttps(baseUrl)}/json`
      const malformedUrl = options.malformedUrl ?? `${baseUrl}/malformed`
      const timeoutUrl = options.timeoutUrl ?? `${baseUrl}/slow`

      yield* expectHttpFailure(
        configuredClient.get(dnsUrl).pipe(Effect.flatMap((response) => response.text)),
        ["TransportError"],
        "http error mapping (dns)"
      )

      yield* expectHttpFailure(
        configuredClient.get(refusedUrl).pipe(Effect.flatMap((response) => response.text)),
        ["TransportError"],
        "http error mapping (connection refused)"
      )

      yield* expectHttpFailure(
        configuredClient.get(tlsUrl).pipe(Effect.flatMap((response) => response.text)),
        ["TransportError"],
        "http error mapping (tls)"
      )

      yield* expectHttpFailure(
        configuredClient.get(malformedUrl).pipe(Effect.flatMap((response) => response.json)),
        ["TransportError", "DecodeError", "EmptyBodyError"],
        "http error mapping (malformed response)"
      )

      if (options.configureTimeout) {
        yield* expectHttpFailure(
          configuredClient.get(timeoutUrl).pipe(Effect.flatMap((response) => response.text)),
          ["TransportError"],
          "http error mapping (timeout)"
        )
      }
    }).pipe(Effect.provide(layer))
  )
}
