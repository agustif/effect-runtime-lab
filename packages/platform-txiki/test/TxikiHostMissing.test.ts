import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as TxikiFileSystem from "../src/TxikiFileSystem.ts";

describe("Txiki host assumptions", () => {
  it("fails clearly when the tjs global is unavailable", async () => {
    const original = (globalThis as typeof globalThis & { tjs?: unknown }).tjs;
    delete (globalThis as typeof globalThis & { tjs?: unknown }).tjs;
    try {
      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            return yield* fs.exists("/");
          }).pipe(Effect.provide(TxikiFileSystem.layer)),
        ),
      ).rejects.toMatchObject({ _tag: "PlatformError" });
    } finally {
      (globalThis as typeof globalThis & { tjs?: unknown }).tjs = original;
    }
  });
});
