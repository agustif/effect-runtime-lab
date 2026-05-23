import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import type * as Layer from "effect/Layer";

export interface TempContractOptions {
  readonly prefix?: string;
  readonly suffix?: string;
}

export const verifyBasicTempLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  options?: TempContractOptions,
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      const dir = yield* fs.makeTempDirectory({ prefix: options?.prefix });
      const dirStat = yield* fs.stat(dir);
      if (dirStat.type !== "Directory") {
        throw new Error(`temp directory contract failed: ${dirStat.type}`);
      }

      const file = yield* fs.makeTempFile({ prefix: options?.prefix, suffix: options?.suffix });
      const fileStat = yield* fs.stat(file);
      if (fileStat.type !== "File") {
        throw new Error(`temp file contract failed: ${fileStat.type}`);
      }

      let scopedDirectory = "";
      yield* Effect.scoped(
        Effect.gen(function* () {
          scopedDirectory = yield* fs.makeTempDirectoryScoped({ prefix: options?.prefix });
          const stat = yield* fs.stat(scopedDirectory);
          if (stat.type !== "Directory") {
            throw new Error(`scoped temp directory contract failed: ${stat.type}`);
          }
        }),
      );
      const scopedDirectoryRemoved = yield* Effect.match(fs.stat(scopedDirectory), {
        onFailure: () => true,
        onSuccess: () => false,
      });
      if (!scopedDirectoryRemoved) {
        throw new Error("scoped temp directory cleanup contract failed");
      }

      let scopedFile = "";
      yield* Effect.scoped(
        Effect.gen(function* () {
          scopedFile = yield* fs.makeTempFileScoped({
            prefix: options?.prefix,
            suffix: options?.suffix,
          });
          const stat = yield* fs.stat(scopedFile);
          if (stat.type !== "File") {
            throw new Error(`scoped temp file contract failed: ${stat.type}`);
          }
        }),
      );
      const scopedFileRemoved = yield* Effect.match(fs.stat(scopedFile), {
        onFailure: () => true,
        onSuccess: () => false,
      });
      if (!scopedFileRemoved) {
        throw new Error("scoped temp file cleanup contract failed");
      }

      yield* fs.remove(file, { force: true });
      yield* fs.remove(dir, { recursive: true, force: true });
    }).pipe(Effect.provide(layer)),
  );
};
