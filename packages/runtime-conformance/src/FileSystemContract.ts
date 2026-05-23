import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as FileSystem from "effect/FileSystem";

export const verifyBasicFileSystemLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  options?: {
    readonly directory?: string;
    readonly fileName?: string;
    readonly renamedFileName?: string;
  },
) => {
  const directory = options?.directory ?? "/tmp-runtime-conformance";
  const fileName = options?.fileName ?? "hello.txt";
  const renamedFileName = options?.renamedFileName ?? "renamed.txt";
  const file = `${directory}/${fileName}`;
  const renamed = `${directory}/${renamedFileName}`;

  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      yield* fs.makeDirectory(directory, { recursive: true });
      yield* fs.writeFile(file, new TextEncoder().encode("hello"));

      const exists = yield* fs.exists(file);
      if (!exists) throw new Error("exists contract failed");

      const data = yield* fs.readFile(file);
      if (new TextDecoder().decode(data) !== "hello") {
        throw new Error("read/write contract failed");
      }

      const entries = yield* fs.readDirectory(directory);
      if (!entries.includes(fileName)) {
        throw new Error(`readDirectory contract failed: ${JSON.stringify(entries)}`);
      }

      const stat = yield* fs.stat(file);
      if (stat.type !== "File") {
        throw new Error(`stat contract failed: ${stat.type}`);
      }

      yield* fs.rename(file, renamed);
      const resolved = yield* fs.realPath(renamed);
      if (typeof resolved !== "string" || resolved.length === 0) {
        throw new Error("realPath contract failed");
      }

      yield* fs.remove(renamed);
      yield* fs.remove(directory);
    }).pipe(Effect.provide(layer)),
  );
};
