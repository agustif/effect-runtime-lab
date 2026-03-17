import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as QuickJSFileSystem from "../src/QuickJSFileSystem.ts"
import * as QuickJSHttpClient from "../src/QuickJSHttpClient.ts"

describe("QuickJS host assumptions", () => {
  it("fails clearly when the os host module is unavailable", async () => {
    const original = (globalThis as typeof globalThis & { os?: unknown }).os
    delete (globalThis as typeof globalThis & { os?: unknown }).os
    try {
      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem
            return yield* fs.exists("/")
          }).pipe(Effect.provide(QuickJSFileSystem.layer))
        )
      ).resolves.toBe(false)
    } finally {
      ;(globalThis as typeof globalThis & { os?: unknown }).os = original
    }
  })

  it("fails clearly when the http host module is unavailable", async () => {
    const original = (globalThis as typeof globalThis & { http?: unknown }).http
    delete (globalThis as typeof globalThis & { http?: unknown }).http
    try {
      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const client = yield* HttpClient.HttpClient
            yield* client.get("http://127.0.0.1")
          }).pipe(Effect.provide(QuickJSHttpClient.layer))
        )
      ).rejects.toMatchObject({ _tag: "HttpClientError" })
    } finally {
      ;(globalThis as typeof globalThis & { http?: unknown }).http = original
    }
  })
})
