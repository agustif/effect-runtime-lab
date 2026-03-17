import { beforeEach, describe, expect, it } from "vitest"
import * as ConformanceHttp from "@effect-experimental/runtime-conformance/HttpClientContract"
import * as ConformanceRedirect from "@effect-experimental/runtime-conformance/RedirectContract"
import * as ConformanceUpload from "@effect-experimental/runtime-conformance/UploadContract"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as QuickJSHttpClient from "../src/QuickJSHttpClient.ts"

const encoder = new TextEncoder()
const requests: Array<{ method: string; url: string; timeout: number; options?: unknown }> = []

type MultipartEntry = readonly [name: unknown, value: unknown, filename?: unknown]
type MultipartIterable = {
  multipartEntries?: () => Iterable<MultipartEntry>
  entries?: () => Iterable<readonly [unknown, unknown]>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const multipartEntriesOf = (value: unknown): Array<MultipartEntry> => {
  if (!isRecord(value)) return []
  if (typeof value.multipartEntries === "function") {
    return Array.from(value.multipartEntries())
  }
  if (typeof value.entries === "function") {
    return Array.from(value.entries()).map(([name, entryValue]) => [name, entryValue, undefined] as const)
  }
  return []
}

const previewValueName = (value: unknown): string => {
  if (isRecord(value) && typeof value.name === "string") {
    return value.name
  }
  return String(value)
}

beforeEach(() => {
  requests.length = 0
  ;(globalThis as typeof globalThis & { http?: unknown }).http = {
    globalInit() {},
    globalCleanup() {},
    request: async (method: string, url: string, _body: unknown, _headers: string, timeout: number, options?: { signal?: AbortSignal }) => {
      requests.push({ method, url, timeout, options })
      if (url.endsWith("/json")) {
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "hello from runtime fixture" })
        }
      }
      if (url.endsWith("/binary")) {
        return {
          statusCode: 200,
          headers: { "content-type": "application/octet-stream" },
          bodyBytes: Uint8Array.from([0, 255, 1, 2, 3, 128]).buffer
        }
      }
      if (url.endsWith("/invalid-json")) {
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: "{ invalid json"
        }
      }
      if (url.endsWith("/head") && method === "HEAD") {
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: ""
        }
      }
      if (url.endsWith("/echo-json") && method === "POST") {
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value: "echo" })
        }
      }
      if (url.endsWith("/upload-bytes") && method === "POST") {
        const bytes = typeof _body === "string"
          ? new TextEncoder().encode(_body)
          : _body instanceof Uint8Array
          ? _body
          : _body instanceof ArrayBuffer
          ? new Uint8Array(_body)
          : new Uint8Array(0)
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ length: bytes.byteLength, contentType: "application/octet-stream" })
        }
      }
      if (url.endsWith("/upload-form") && method === "POST") {
        const isFormData = typeof FormData !== "undefined" && _body instanceof FormData
        const entries = isFormData ? multipartEntriesOf(_body) : []
        const preview = entries.map((entry) => {
          const [name, value, filename] = entry
          return `${String(name)}:${String(filename ?? previewValueName(value))}`
        }).join("|")
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            length: isFormData ? entries.length : 0,
            contentType: isFormData ? "multipart/form-data; boundary=fixture" : "",
            bodyPreview: isFormData ? preview : ""
          })
        }
      }
      if (url.endsWith("/cookies")) {
        return {
          statusCode: 200,
          headers: { "set-cookie": ["a=1; Path=/", "b=2; Path=/"] },
          body: "cookies"
        }
      }
      if (url.endsWith("/redirect")) {
        return {
          statusCode: 302,
          headers: { location: "/json" },
          body: "redirect"
        }
      }
      if (url.endsWith("/slow")) {
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({
              statusCode: 200,
              headers: { "content-type": "text/plain" },
              body: "slow response"
            })
          }, 200)
          options?.signal?.addEventListener("abort", () => {
            clearTimeout(timer)
            reject(new Error("aborted"))
          }, { once: true })
        })
      }
      return {
        statusCode: 404,
        headers: { "content-type": "text/plain" },
        body: new TextDecoder().decode(encoder.encode("not found"))
      }
    }
  }
})

describe("QuickJSHttpClient", () => {
  it("satisfies the shared basic http client contract with a mocked host", async () => {
    await ConformanceHttp.verifyBasicHttpClientLayer(QuickJSHttpClient.layer, "http://fixture")
  })

  it("satisfies the shared advanced http client contract with a mocked host", async () => {
    await ConformanceHttp.verifyAdvancedHttpClientLayer(QuickJSHttpClient.layer, "http://fixture")
  })

  it("satisfies the shared redirect contract with a mocked host", async () => {
    await ConformanceRedirect.verifyRedirectHttpClientLayer(QuickJSHttpClient.layer, "http://fixture")
  })

  it("passes QuickJS-specific options through to the host request", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const configured = client.pipe(
          QuickJSHttpClient.withOptions({
            follow: false,
            insecure: true,
            ca: "/tmp/test-ca.pem",
            timeoutSeconds: 7
          })
        )
        const response = yield* configured.pipe(HttpClient.followRedirects()).get("http://fixture/redirect")
        const json = yield* response.json
        expect(json).toMatchObject({ message: "hello from runtime fixture" })
      }).pipe(Effect.provide(QuickJSHttpClient.layer))
    )
    const last = requests.at(-1)
    expect(last?.timeout).toBe(7)
    expect(last?.options).toMatchObject({
      follow: false,
      insecure: true,
      ca: "/tmp/test-ca.pem"
    })
  })

  it("satisfies the shared upload contract with a mocked host", async () => {
    await ConformanceUpload.verifyAdvancedUploadHttpClientLayer(QuickJSHttpClient.layer, "http://fixture")
  })
})
