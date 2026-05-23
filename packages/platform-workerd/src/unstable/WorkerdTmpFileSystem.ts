/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as WorkerdTmpPath from "./WorkerdTmpPath.ts";

const TypeId = "~@effect-experimental/platform-workerd/unstable/WorkerdTmpFileSystem";

/**
 * @since 1.0.0
 * @category errors
 */
export class WorkerdTmpFileSystemError extends Data.TaggedError("WorkerdTmpFileSystemError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

/**
 * @since 1.0.0
 * @category models
 */
export interface WorkerdTmpFileSystem {
  readonly [TypeId]: typeof TypeId;
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, WorkerdTmpFileSystemError>;
  readonly readText: (path: string) => Effect.Effect<string, WorkerdTmpFileSystemError>;
  readonly writeFile: (
    path: string,
    data: Uint8Array | string,
  ) => Effect.Effect<void, WorkerdTmpFileSystemError>;
  readonly remove: (path: string) => Effect.Effect<void, WorkerdTmpFileSystemError>;
  readonly makeDirectory: (path: string) => Effect.Effect<void, WorkerdTmpFileSystemError>;
  readonly exists: (path: string) => Effect.Effect<boolean, WorkerdTmpFileSystemError>;
  readonly tmpPath: WorkerdTmpPath.WorkerdTmpPath;
}

/**
 * @since 1.0.0
 * @category tags
 */
export const WorkerdTmpFileSystem: Context.Service<WorkerdTmpFileSystem, WorkerdTmpFileSystem> =
  Context.Service(TypeId);

const withFs = <A>(
  operation: string,
  f: (fs: typeof import("node:fs/promises")) => Promise<A>,
): Effect.Effect<A, WorkerdTmpFileSystemError> =>
  Effect.tryPromise({
    try: async () => {
      const fs = await import("node:fs/promises");
      return f(fs);
    },
    catch: (cause) => new WorkerdTmpFileSystemError({ operation, cause }),
  });

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (): WorkerdTmpFileSystem => {
  const tmpPath = WorkerdTmpPath.make();

  return WorkerdTmpFileSystem.of({
    [TypeId]: TypeId,
    tmpPath,
    exists: (path) =>
      Effect.match(
        withFs("stat", (fs) => fs.stat(path)),
        {
          onSuccess: () => true,
          onFailure: () => false,
        },
      ),
    makeDirectory: (path) =>
      withFs("mkdir", (fs) => fs.mkdir(path, { recursive: true })).pipe(Effect.asVoid),
    readFile: (path) => withFs("readFile", async (fs) => new Uint8Array(await fs.readFile(path))),
    readText: (path) => withFs("readFile", (fs) => fs.readFile(path, "utf8")),
    remove: (path) =>
      withFs("rm", (fs) => fs.rm(path, { recursive: true, force: true })).pipe(Effect.asVoid),
    writeFile: (path, data) =>
      withFs("writeFile", async (fs) => {
        const segments = path.split("/");
        const parent =
          segments.length <= 1 ? "." : tmpPath.normalize(segments.slice(0, -1).join("/") || "/");
        await fs.mkdir(parent, { recursive: true });
        await fs.writeFile(path, data);
      }).pipe(Effect.asVoid),
  });
};

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<WorkerdTmpFileSystem> = Layer.succeed(WorkerdTmpFileSystem, make());
