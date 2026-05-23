import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import type * as Layer from "effect/Layer";
import * as PlatformError from "effect/PlatformError";

export interface FileHandleContractOptions {
  readonly directory: string;
  readonly fileName: string;
  readonly permissionDeniedPath?: string;
}

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (value: string) => new TextEncoder().encode(value);

const resolveSystemTag = (
  error: PlatformError.PlatformError,
): PlatformError.SystemErrorTag | "BadArgument" =>
  "_tag" in error.reason ? error.reason._tag : "BadArgument";

const expectSystemError = <A, R>(
  effect: Effect.Effect<A, PlatformError.PlatformError, R>,
  expected: ReadonlyArray<PlatformError.SystemErrorTag | "BadArgument">,
  label: string,
) =>
  Effect.match(effect, {
    onSuccess: () => {
      throw new Error(`${label} expected failure, but it succeeded`);
    },
    onFailure: (error) => {
      const tag = resolveSystemTag(error);
      if (!expected.includes(tag)) {
        throw new Error(`${label} expected ${expected.join(" | ")}, got ${tag}`);
      }
    },
  });

export const verifyBasicFileHandleLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  options: FileHandleContractOptions,
) => {
  const path = `${options.directory}/${options.fileName}`;
  const appendPath = `${options.directory}/append-${options.fileName}`;

  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(options.directory, { recursive: true });

      yield* Effect.scoped(
        Effect.gen(function* () {
          const file = yield* fs.open(path, { flag: "w+" });
          yield* file.write(encode("hello world"));
          yield* file.seek(FileSystem.Size(0), "start");
          const initial = yield* file
            .readAlloc(FileSystem.Size(11))
            .pipe(Effect.flatMap((_) => _.asEffect()));
          if (decode(initial) !== "hello world") {
            throw new Error(`file-handle read/write contract failed: ${decode(initial)}`);
          }

          yield* file.seek(FileSystem.Size(6), "start");
          yield* file.write(encode("effect"));
          const rewritten = yield* fs.readFile(path);
          if (decode(rewritten) !== "hello effect") {
            throw new Error(`file-handle overwrite contract failed: ${decode(rewritten)}`);
          }

          yield* file.truncate(FileSystem.Size(5));
          const truncated = yield* fs.readFile(path);
          if (decode(truncated) !== "hello") {
            throw new Error(`file-handle truncate contract failed: ${decode(truncated)}`);
          }

          yield* file.seek(FileSystem.Size(0), "start");
          yield* file.truncate(FileSystem.Size(0));
          yield* file.write(encode("lorem ipsum dolor sit amet"));
          yield* file.seek(FileSystem.Size(6), "start");
          yield* file.truncate(FileSystem.Size(11));
          yield* file.write(encode("X"));
          const preservedCursorResult = yield* fs.readFile(path);
          if (decode(preservedCursorResult) !== "lorem Xpsum") {
            throw new Error(
              `file-handle truncate cursor preservation failed: ${decode(preservedCursorResult)}`,
            );
          }

          yield* file.seek(FileSystem.Size(0), "start");
          yield* file.truncate(FileSystem.Size(0));
          yield* file.write(encode("lorem ipsum dolor sit amet"));
          yield* file.truncate(FileSystem.Size(11));
          yield* file.write(encode("!"));
          const clampedCursorResult = yield* fs.readFile(path);
          if (decode(clampedCursorResult) !== "lorem ipsum!") {
            throw new Error(
              `file-handle truncate cursor clamp failed: ${decode(clampedCursorResult)}`,
            );
          }
        }),
      );

      yield* Effect.scoped(
        Effect.gen(function* () {
          const file = yield* fs.open(appendPath, { flag: "a+" });

          yield* file.write(encode("foo"));
          yield* file.seek(FileSystem.Size(0), "start");

          yield* file.write(encode("bar"));
          const firstAppend = yield* fs.readFile(appendPath);
          if (decode(firstAppend) !== "foobar") {
            throw new Error(`file-handle append contract failed: ${decode(firstAppend)}`);
          }

          const firstRead = yield* file
            .readAlloc(FileSystem.Size(3))
            .pipe(Effect.flatMap((_) => _.asEffect()));
          if (decode(firstRead) !== "foo") {
            throw new Error(`file-handle append read cursor contract failed: ${decode(firstRead)}`);
          }

          yield* file.write(encode("baz"));
          const secondAppend = yield* fs.readFile(appendPath);
          if (decode(secondAppend) !== "foobarbaz") {
            throw new Error(`file-handle append write contract failed: ${decode(secondAppend)}`);
          }

          const secondRead = yield* file
            .readAlloc(FileSystem.Size(6))
            .pipe(Effect.flatMap((_) => _.asEffect()));
          if (decode(secondRead) !== "barbaz") {
            throw new Error(
              `file-handle append cursor persistence contract failed: ${decode(secondRead)}`,
            );
          }
        }),
      );

      yield* fs.remove(path, { force: true });
      yield* fs.remove(appendPath, { force: true });
      yield* fs.remove(options.directory, { force: true });
    }).pipe(Effect.provide(layer)),
  );
};

export const verifyAdvancedFileHandleLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  options: FileHandleContractOptions,
) => {
  await verifyBasicFileHandleLayer(layer, options);
  const path = `${options.directory}/${options.fileName}`;
  const appendPath = `${options.directory}/append-${options.fileName}`;
  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(options.directory, { recursive: true });

      yield* Effect.scoped(
        Effect.gen(function* () {
          const file = yield* fs.open(path, { flag: "w+" });
          yield* file.write(encode("abcdef"));
          yield* file.seek(FileSystem.Size(2), "start");
          const middle = yield* file
            .readAlloc(FileSystem.Size(2))
            .pipe(Effect.flatMap((_) => _.asEffect()));
          if (decode(middle) !== "cd") {
            throw new Error(`file-handle seek/start contract failed: ${decode(middle)}`);
          }
          yield* file.seek(FileSystem.Size(1), "current");
          yield* file.write(encode("Z"));
          const updated = yield* fs.readFile(path);
          if (decode(updated) !== "abcdeZ") {
            throw new Error(`file-handle seek/current contract failed: ${decode(updated)}`);
          }
        }),
      );

      yield* Effect.scoped(
        Effect.gen(function* () {
          const file = yield* fs.open(appendPath, { flag: "a+" });
          yield* file.write(encode("alpha"));
          yield* file.truncate(FileSystem.Size(3));
          yield* file.write(encode("beta"));
          const appended = yield* fs.readFile(appendPath);
          if (decode(appended) !== "alpbeta") {
            throw new Error(`file-handle append truncate contract failed: ${decode(appended)}`);
          }
        }),
      );

      yield* fs.remove(path, { force: true });
      yield* fs.remove(appendPath, { force: true });
      yield* fs.remove(options.directory, { force: true });
    }).pipe(Effect.provide(layer)),
  );
};

export const verifyHostFileHandleLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  options: FileHandleContractOptions,
) => {
  await verifyAdvancedFileHandleLayer(layer, options);
  const path = `${options.directory}/${options.fileName}`;
  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(options.directory, { recursive: true });
      yield* fs.writeFile(path, encode("host-check"));

      yield* Effect.scoped(
        Effect.gen(function* () {
          const file = yield* fs.open(path, { flag: "r+" });
          yield* file.sync;
        }),
      );

      const closedFile = yield* Effect.scoped(fs.open(path, { flag: "r+" }));
      yield* expectSystemError(
        closedFile.read(new Uint8Array(1)),
        ["BadResource", "NotFound"],
        "file-handle closed read",
      );

      if (options.permissionDeniedPath) {
        yield* expectSystemError(
          Effect.scoped(fs.open(options.permissionDeniedPath, { flag: "r" })),
          ["PermissionDenied"],
          "file-handle permission denied",
        );
      }

      yield* fs.remove(path, { force: true });
      yield* fs.remove(options.directory, { force: true });
    }).pipe(Effect.provide(layer)),
  );
};
