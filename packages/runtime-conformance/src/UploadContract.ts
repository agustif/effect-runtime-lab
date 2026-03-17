import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"

const encoder = new TextEncoder()

const UploadBytesResponse = Schema.Struct({
  length: Schema.Number,
  contentType: Schema.String
})

const UploadFormResponse = Schema.Struct({
  length: Schema.Number,
  contentType: Schema.String,
  bodyPreview: Schema.String
})

export const verifyBasicUploadHttpClientLayer = async (
  layer: Layer.Layer<HttpClient.HttpClient, never, never>,
  baseUrl: string
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient

      const bytesRequest = HttpClientRequest.post(`${baseUrl}/upload-bytes`).pipe(
        HttpClientRequest.bodyUint8Array(encoder.encode("upload-bytes"), "application/octet-stream")
      )
      const bytesResponse = yield* client.execute(bytesRequest).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadBytesResponse))
      )
      if (bytesResponse.length !== 12 || !bytesResponse.contentType.includes("application/octet-stream")) {
        throw new Error(`upload bytes contract failed: ${JSON.stringify(bytesResponse)}`)
      }

      const streamRequest = HttpClientRequest.post(`${baseUrl}/upload-bytes`).pipe(
        HttpClientRequest.bodyStream(
          Stream.make(
            encoder.encode("upload-"),
            encoder.encode("stream")
          ),
          {
            contentType: "application/octet-stream",
            contentLength: 13
          }
        )
      )
      const streamResponse = yield* client.execute(streamRequest).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadBytesResponse))
      )
      if (streamResponse.length !== 13 || !streamResponse.contentType.includes("application/octet-stream")) {
        throw new Error(`upload stream contract failed: ${JSON.stringify(streamResponse)}`)
      }

      const formRequest = HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
        HttpClientRequest.bodyFormDataRecord({
          field: "value",
          enabled: true
        })
      )
      const formResponse = yield* client.execute(formRequest).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadFormResponse))
      )
      if (formResponse.length <= 0 || !formResponse.contentType.toLowerCase().includes("multipart/form-data")) {
        throw new Error(`upload form contract failed: ${JSON.stringify(formResponse)}`)
      }
      if (!formResponse.bodyPreview.includes("field") || !formResponse.bodyPreview.includes("value")) {
        throw new Error(`upload form preview contract failed: ${JSON.stringify(formResponse)}`)
      }

      if (typeof FormData !== "undefined" && typeof File !== "undefined") {
        const data = new FormData()
        data.append("field", "value")
        data.append("file", new File([encoder.encode("blob-data")], "file.txt", { type: "text/plain" }))
        const formFileRequest = HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
          HttpClientRequest.bodyFormData(data)
        )
        const formFileResponse = yield* client.execute(formFileRequest).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadFormResponse))
        )
        if (!formFileResponse.contentType.toLowerCase().includes("multipart/form-data")) {
          throw new Error(`upload file form contract failed: ${JSON.stringify(formFileResponse)}`)
        }
        if (
          !formFileResponse.bodyPreview.includes("file") ||
          !formFileResponse.bodyPreview.includes("file.txt")
        ) {
          throw new Error(`upload file preview contract failed: ${JSON.stringify(formFileResponse)}`)
        }
      }
    }).pipe(Effect.provide(layer))
  )
}

export const verifyAdvancedUploadHttpClientLayer = async (
  layer: Layer.Layer<HttpClient.HttpClient, never, never>,
  baseUrl: string
) => {
  await verifyBasicUploadHttpClientLayer(layer, baseUrl)
  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient

      const streamParts = [
        encoder.encode("upload-"),
        encoder.encode("stream-"),
        encoder.encode("extra")
      ]
      const streamLength = streamParts.reduce((total, part) => total + part.byteLength, 0)
      const streamRequest = HttpClientRequest.post(`${baseUrl}/upload-bytes`).pipe(
        HttpClientRequest.bodyStream(
          Stream.fromIterable(streamParts)
        )
      )
      const streamResponse = yield* client.execute(streamRequest).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadBytesResponse))
      )
      if (streamResponse.length !== streamLength || !streamResponse.contentType.includes("application/octet-stream")) {
        throw new Error(`advanced stream upload contract failed: ${JSON.stringify(streamResponse)}`)
      }

      const multiFieldRequest = HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
        HttpClientRequest.bodyFormDataRecord({
          tag: ["one", "two"],
          enabled: true
        })
      )
      const multiFieldResponse = yield* client.execute(multiFieldRequest).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadFormResponse))
      )
      if (!multiFieldResponse.contentType.toLowerCase().includes("multipart/form-data")) {
        throw new Error(`advanced multipart content type failed: ${JSON.stringify(multiFieldResponse)}`)
      }
      if (
        !multiFieldResponse.bodyPreview.includes("tag") ||
        !multiFieldResponse.bodyPreview.includes("one") ||
        !multiFieldResponse.bodyPreview.includes("two")
      ) {
        throw new Error(`advanced multipart field preview failed: ${JSON.stringify(multiFieldResponse)}`)
      }

      if (typeof FormData !== "undefined" && typeof File !== "undefined") {
        const data = new FormData()
        data.append("fileA", new File([encoder.encode("file-a")], "file-a.txt", { type: "text/plain" }))
        data.append("fileB", new File([encoder.encode("file-b")], "file-b.txt", { type: "text/plain" }))
        const multiFileRequest = HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
          HttpClientRequest.bodyFormData(data)
        )
        const multiFileResponse = yield* client.execute(multiFileRequest).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadFormResponse))
        )
        if (!multiFileResponse.contentType.toLowerCase().includes("multipart/form-data")) {
          throw new Error(`advanced multipart file content type failed: ${JSON.stringify(multiFileResponse)}`)
        }
        if (
          !multiFileResponse.bodyPreview.includes("file-a.txt") ||
          !multiFileResponse.bodyPreview.includes("file-b.txt")
        ) {
          throw new Error(`advanced multipart file preview failed: ${JSON.stringify(multiFileResponse)}`)
        }
      }

      const largeChunk = new Uint8Array(128 * 1024)
      largeChunk.fill(7)
      const largeRequest = HttpClientRequest.post(`${baseUrl}/upload-bytes`).pipe(
        HttpClientRequest.bodyStream(Stream.make(largeChunk))
      )
      const largeResponse = yield* client.execute(largeRequest).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(UploadBytesResponse))
      )
      if (largeResponse.length !== largeChunk.byteLength) {
        throw new Error(`large stream upload contract failed: ${JSON.stringify(largeResponse)}`)
      }
    }).pipe(Effect.provide(layer))
  )
}

export const verifyStrictUploadHttpClientLayer = async (
  layer: Layer.Layer<HttpClient.HttpClient, never, never>,
  baseUrl: string
) => {
  await verifyAdvancedUploadHttpClientLayer(layer, baseUrl)
  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const malformed = HttpClientRequest.post(`${baseUrl}/upload-form-strict`).pipe(
        HttpClientRequest.bodyUint8Array(encoder.encode("missing-boundary"), "multipart/form-data; boundary=missing")
      )
      const response = yield* client.execute(malformed)
      if (response.status !== 400) {
        throw new Error(`strict multipart boundary contract failed: ${response.status}`)
      }
    }).pipe(Effect.provide(layer))
  )
}
