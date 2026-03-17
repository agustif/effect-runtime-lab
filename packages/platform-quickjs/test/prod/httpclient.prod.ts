import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import * as Stream from "effect/Stream"
import * as ConformanceHttp from "@effect-experimental/runtime-conformance/HttpClientContract"
import * as ConformanceUpload from "@effect-experimental/runtime-conformance/UploadContract"
import * as QuickJSHttpClient from "../../src/QuickJSHttpClient.ts"

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
  if (!new TextDecoder().decode(merged).includes("quickjs server")) {
    throw new Error("stream body failed")
  }
  const redirected = yield* client.pipe(HttpClient.followRedirects()).get(`${baseUrl}/redirect`)
  const redirectedJson = yield* redirected.json
  if (typeof redirectedJson !== "object" || redirectedJson === null || !("message" in redirectedJson)) {
    throw new Error("redirect handling failed")
  }
  const timed = yield* client.get(`${baseUrl}/slow`).pipe(
    Effect.flatMap((response) => response.text),
    Effect.timeout(10),
    Effect.asSome,
    Effect.catchTag("TimeoutError", () => Effect.succeedNone)
  )
  if (timed._tag !== "None") {
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
  const uploaded = yield* HttpClientRequest.post(`${baseUrl}/upload-bytes`).pipe(
    HttpClientRequest.bodyUint8Array(new TextEncoder().encode("upload-bytes"), "application/octet-stream"),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({
      length: Schema.Number,
      contentType: Schema.String
    })))
  )
  if (uploaded.length !== 12) {
    throw new Error("byte upload handling failed")
  }
  const uploadedStream = yield* HttpClientRequest.post(`${baseUrl}/upload-bytes`).pipe(
    HttpClientRequest.bodyStream(
      Stream.make(
        new TextEncoder().encode("upload-"),
        new TextEncoder().encode("stream")
      ),
      {
        contentType: "application/octet-stream",
        contentLength: 13
      }
    ),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({
      length: Schema.Number,
      contentType: Schema.String
    })))
  )
  if (uploadedStream.length !== 13) {
    throw new Error("stream upload handling failed")
  }
  const uploadedForm = yield* HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
    HttpClientRequest.bodyFormDataRecord({
      field: "value",
      enabled: true
    }),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({
      length: Schema.Number,
      contentType: Schema.String,
      bodyPreview: Schema.String
    })))
  )
  if (!uploadedForm.contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error("form upload handling failed")
  }
  const fileData = new FormData()
  fileData.append("field", "value")
  fileData.append("file", new File([new TextEncoder().encode("blob-data")], "file.txt", { type: "text/plain" }))
  const uploadedFormFile = yield* HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
    HttpClientRequest.bodyFormData(fileData),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({
      length: Schema.Number,
      contentType: Schema.String,
      bodyPreview: Schema.String
    })))
  )
  if (
    !uploadedFormFile.contentType.toLowerCase().includes("multipart/form-data") ||
    !uploadedFormFile.bodyPreview.includes("file.txt")
  ) {
    throw new Error("form file upload handling failed")
  }

  const uploadedStreamDefault = yield* HttpClientRequest.post(`${baseUrl}/upload-bytes`).pipe(
    HttpClientRequest.bodyStream(
      Stream.make(
        new TextEncoder().encode("upload-"),
        new TextEncoder().encode("stream-"),
        new TextEncoder().encode("extra")
      )
    ),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({
      length: Schema.Number,
      contentType: Schema.String
    })))
  )
  if (
    uploadedStreamDefault.length !== 19 ||
    !uploadedStreamDefault.contentType.includes("application/octet-stream")
  ) {
    throw new Error("stream upload default content type handling failed")
  }

  const uploadedFormRecord = yield* HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
    HttpClientRequest.bodyFormDataRecord({
      tag: ["one", "two"],
      enabled: true
    }),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({
      length: Schema.Number,
      contentType: Schema.String,
      bodyPreview: Schema.String
    })))
  )
  if (
    !uploadedFormRecord.contentType.toLowerCase().includes("multipart/form-data") ||
    !uploadedFormRecord.bodyPreview.includes("tag") ||
    !uploadedFormRecord.bodyPreview.includes("one") ||
    !uploadedFormRecord.bodyPreview.includes("two")
  ) {
    throw new Error("multipart record upload handling failed")
  }

  const multiFileData = new FormData()
  multiFileData.append("fileA", new File([new TextEncoder().encode("file-a")], "file-a.txt", { type: "text/plain" }))
  multiFileData.append("fileB", new File([new TextEncoder().encode("file-b")], "file-b.txt", { type: "text/plain" }))
  const uploadedMultiFile = yield* HttpClientRequest.post(`${baseUrl}/upload-form`).pipe(
    HttpClientRequest.bodyFormData(multiFileData),
    Effect.flatMap((request) => client.execute(request)),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Struct({
      length: Schema.Number,
      contentType: Schema.String,
      bodyPreview: Schema.String
    })))
  )
  if (
    !uploadedMultiFile.contentType.toLowerCase().includes("multipart/form-data") ||
    !uploadedMultiFile.bodyPreview.includes("file-a.txt") ||
    !uploadedMultiFile.bodyPreview.includes("file-b.txt")
  ) {
    throw new Error("multipart multi-file upload handling failed")
  }

  yield* Effect.promise(() =>
    ConformanceUpload.verifyStrictUploadHttpClientLayer(QuickJSHttpClient.layer, baseUrl)
  )

  yield* Effect.promise(() =>
    ConformanceHttp.verifyHttpErrorMappingLayer(
      QuickJSHttpClient.layer,
      baseUrl,
      {
        configureTimeout: (client) => client.pipe(QuickJSHttpClient.withOptions({ timeoutSeconds: 0.05 }))
      }
    )
  )
}).pipe(Effect.provide(QuickJSHttpClient.layer))

Effect.runPromise(main).catch((error) => {
  console.error(error)
  throw error
})
