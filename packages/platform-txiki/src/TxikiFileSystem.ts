/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as PlatformError from "effect/PlatformError";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";

type TjsDirEnt = {
  readonly name: string;
  readonly isBlockDevice: boolean;
  readonly isCharacterDevice: boolean;
  readonly isDirectory: boolean;
  readonly isFIFO: boolean;
  readonly isFile: boolean;
  readonly isSocket: boolean;
  readonly isSymbolicLink: boolean;
};

type TjsStat = {
  readonly dev: number;
  readonly mode: number;
  readonly nlink: number;
  readonly uid: number;
  readonly gid: number;
  readonly rdev: number;
  readonly ino: number;
  readonly size: number;
  readonly blksize: number;
  readonly blocks: number;
  readonly atim: Date;
  readonly mtim: Date;
  readonly ctim: Date;
  readonly birthtim: Date;
  readonly isBlockDevice: boolean;
  readonly isCharacterDevice: boolean;
  readonly isDirectory: boolean;
  readonly isFIFO: boolean;
  readonly isFile: boolean;
  readonly isSocket: boolean;
  readonly isSymbolicLink: boolean;
};

type TjsFileHandle = {
  readonly path: string;
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
  read(buffer: Uint8Array, offset?: number): Promise<number | null>;
  write(buffer: Uint8Array, offset?: number): Promise<number>;
  close(): Promise<void>;
  stat(): Promise<TjsStat>;
  truncate(offset?: number): Promise<void>;
  datasync(): Promise<void>;
  sync(): Promise<void>;
  chmod(mode: number): Promise<void>;
  utime(atime: Date, mtime: Date): Promise<void>;
};

type TjsDirHandle = AsyncIterableIterator<TjsDirEnt> & {
  close(): Promise<void>;
  readonly path: string;
};

type TjsGlobal = {
  readonly tmpDir?: string;
  realPath(path: string): Promise<string>;
  rename(path: string, newPath: string): Promise<void>;
  makeTempDir(template: string): Promise<string>;
  makeTempFile(template: string): Promise<TjsFileHandle>;
  stat(path: string): Promise<TjsStat>;
  lstat(path: string): Promise<TjsStat>;
  chmod(path: string, mode: number): Promise<void>;
  chown(path: string, owner: number, group: number): Promise<void>;
  utime(path: string, atime: Date, mtime: Date): Promise<void>;
  open(path: string, flags: string, mode?: number): Promise<TjsFileHandle>;
  makeDir(
    path: string,
    options?: { readonly mode?: number; readonly recursive?: boolean },
  ): Promise<void>;
  copyFile(path: string, newPath: string): Promise<void>;
  readDir(path: string): Promise<TjsDirHandle>;
  readLink(path: string): Promise<string>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(
    path: string,
    data: string | Uint8Array,
    options?: { readonly mode?: number },
  ): Promise<void>;
  remove(
    path: string,
    options?: { readonly maxRetries?: number; readonly retryDelay?: number },
  ): Promise<void>;
  link(path: string, newPath: string): Promise<void>;
  symlink(
    path: string,
    newPath: string,
    options?: { readonly type?: "file" | "directory" | "junction" },
  ): Promise<void>;
  watch(
    path: string,
    handler: (filename: string, event: "change" | "rename") => void,
  ): { readonly path: string; close(): void };
};

const getTjs = (method: string): Effect.Effect<TjsGlobal, PlatformError.PlatformError> => {
  const tjs = (globalThis as typeof globalThis & { tjs?: TjsGlobal }).tjs;
  return tjs
    ? Effect.succeed(tjs)
    : Effect.fail(
        PlatformError.badArgument({
          module: "TxikiFileSystem",
          method,
          description: "txiki global `tjs` is not available",
        }),
      );
};

const systemError = (method: string, pathOrDescriptor?: string | number) => (cause: unknown) => {
  const code =
    typeof cause === "object" && cause !== null && "code" in cause
      ? String((cause as { code: unknown }).code)
      : "";
  const tag: PlatformError.SystemErrorTag =
    code === "ENOENT"
      ? "NotFound"
      : code === "EBADF"
        ? "BadResource"
        : code === "EACCES" || code === "EPERM"
          ? "PermissionDenied"
          : code === "EEXIST"
            ? "AlreadyExists"
            : code === "EBUSY"
              ? "Busy"
              : code === "EWOULDBLOCK"
                ? "WouldBlock"
                : code === "ETIMEDOUT"
                  ? "TimedOut"
                  : code === "EPIPE"
                    ? "WriteZero"
                    : "Unknown";

  return PlatformError.systemError({
    _tag: tag,
    module: "TxikiFileSystem",
    method,
    pathOrDescriptor,
    cause,
    description: cause instanceof Error ? cause.message : String(cause),
  });
};

const makeInfo = (stat: TjsStat): FileSystem.File.Info => ({
  type: stat.isFile
    ? "File"
    : stat.isDirectory
      ? "Directory"
      : stat.isSymbolicLink
        ? "SymbolicLink"
        : stat.isBlockDevice
          ? "BlockDevice"
          : stat.isCharacterDevice
            ? "CharacterDevice"
            : stat.isFIFO
              ? "FIFO"
              : stat.isSocket
                ? "Socket"
                : "Unknown",
  mtime: Option.some(stat.mtim),
  atime: Option.some(stat.atim),
  birthtime: Option.some(stat.birthtim),
  dev: stat.dev,
  ino: Option.some(stat.ino),
  mode: stat.mode,
  nlink: Option.some(stat.nlink),
  uid: Option.some(stat.uid),
  gid: Option.some(stat.gid),
  rdev: Option.some(stat.rdev),
  size: FileSystem.Size(stat.size),
  blksize: Option.some(FileSystem.Size(stat.blksize)),
  blocks: Option.some(stat.blocks),
});

const joinPath = (left: string, right: string) =>
  left.endsWith("/") ? `${left}${right}` : `${left}/${right}`;
const tempTemplate = (prefix: string | undefined, suffix = "") =>
  `${prefix ?? "tmp-"}XXXXXX${suffix}`;
const renameWithSuffix = async (
  tjs: TjsGlobal,
  path: string,
  suffix: string | undefined,
): Promise<string> => {
  if (!suffix) return path;
  const renamed = `${path}${suffix}`;
  await tjs.rename(path, renamed);
  return renamed;
};

const readDirectoryImpl = async (
  tjs: TjsGlobal,
  path: string,
  recursive: boolean,
): Promise<Array<string>> => {
  const dir = await tjs.readDir(path);
  const out: Array<string> = [];
  try {
    for await (const entry of dir) {
      const child = recursive ? joinPath(path, entry.name) : entry.name;
      out.push(child);
      if (recursive && entry.isDirectory) {
        out.push(...(await readDirectoryImpl(tjs, child, true)));
      }
    }
  } finally {
    await dir.close();
  }
  return out;
};

const readDirectoryEntries = async (tjs: TjsGlobal, path: string): Promise<Set<string>> => {
  const dir = await tjs.readDir(path);
  const entries = new Set<string>();
  try {
    for await (const entry of dir) {
      entries.add(joinPath(path, entry.name));
    }
  } finally {
    await dir.close();
  }
  return entries;
};

const copyRecursive = async (
  tjs: TjsGlobal,
  fromPath: string,
  toPath: string,
  overwrite: boolean,
): Promise<void> => {
  const stat = await tjs.lstat(fromPath);
  if (stat.isDirectory) {
    await tjs.makeDir(toPath, { recursive: true });
    const dir = await tjs.readDir(fromPath);
    try {
      for await (const entry of dir) {
        await copyRecursive(
          tjs,
          joinPath(fromPath, entry.name),
          joinPath(toPath, entry.name),
          overwrite,
        );
      }
    } finally {
      await dir.close();
    }
    return;
  }
  if (stat.isSymbolicLink) {
    const target = await tjs.readLink(fromPath);
    if (overwrite) {
      try {
        await tjs.remove(toPath);
      } catch {}
    }
    await tjs.symlink(target, toPath);
    return;
  }
  if (!overwrite) {
    try {
      await tjs.stat(toPath);
      throw PlatformError.systemError({
        _tag: "AlreadyExists",
        module: "TxikiFileSystem",
        method: "copy",
        pathOrDescriptor: toPath,
        description: "target already exists",
      });
    } catch (cause) {
      if (cause instanceof PlatformError.PlatformError) {
        throw cause;
      }
    }
  }
  await tjs.copyFile(fromPath, toPath);
};

const makeHandle = (handle: TjsFileHandle, append: boolean): FileSystem.File => {
  let cursor = 0;
  const resolveReadOffset = async (): Promise<number | undefined> => cursor;
  const resolveWriteOffset = async (): Promise<number | undefined> => {
    if (append) {
      const info = await handle.stat();
      return info.size;
    }
    return cursor;
  };

  return {
    [FileSystem.FileTypeId]: FileSystem.FileTypeId,
    fd: FileSystem.FileDescriptor(-1),
    stat: Effect.tryPromise({
      try: () => handle.stat().then(makeInfo),
      catch: systemError("stat", handle.path),
    }),
    seek: (offset, from) =>
      Effect.sync(() => {
        const value = Number(offset);
        cursor = from === "start" ? value : cursor + value;
        return FileSystem.Size(cursor);
      }),
    sync: Effect.tryPromise({ try: () => handle.sync(), catch: systemError("sync", handle.path) }),
    read: (buffer) =>
      Effect.tryPromise({
        try: async () => {
          const bytesRead = await handle.read(buffer, await resolveReadOffset());
          const amount = bytesRead ?? 0;
          cursor += amount;
          return FileSystem.Size(amount);
        },
        catch: systemError("read", handle.path),
      }),
    readAlloc: (size) =>
      Effect.tryPromise({
        try: async () => {
          const buffer = new Uint8Array(Number(size));
          const bytesRead = await handle.read(buffer, await resolveReadOffset());
          if (bytesRead === null || bytesRead === 0) {
            return Option.none<Uint8Array>();
          }
          cursor += bytesRead;
          return Option.some(buffer.subarray(0, bytesRead));
        },
        catch: systemError("readAlloc", handle.path),
      }),
    truncate: (length) =>
      Effect.tryPromise({
        try: async () => {
          const value = length === undefined ? undefined : Number(length);
          await handle.truncate(value);
          if (value !== undefined && cursor > value) {
            cursor = value;
          }
        },
        catch: systemError("truncate", handle.path),
      }),
    write: (buffer) =>
      Effect.tryPromise({
        try: async () => {
          const bytesWritten = await handle.write(buffer, await resolveWriteOffset());
          if (!append) {
            cursor += bytesWritten;
          }
          return FileSystem.Size(bytesWritten);
        },
        catch: systemError("write", handle.path),
      }),
    writeAll: (buffer) =>
      Effect.tryPromise({
        try: async () => {
          let offset = 0;
          while (offset < buffer.byteLength) {
            const written = await handle.write(buffer.subarray(offset), await resolveWriteOffset());
            if (written <= 0) {
              throw new Error("write returned 0 bytes");
            }
            offset += written;
            if (!append) {
              cursor += written;
            }
          }
        },
        catch: systemError("writeAll", handle.path),
      }),
  };
};

const access: FileSystem.FileSystem["access"] = (path, options) =>
  Effect.flatMap(getTjs("access"), (tjs) =>
    Effect.tryPromise({
      try: async () => {
        await tjs.stat(path);
        if (options?.readable || options?.writable) {
          const handle = await tjs.open(path, options.writable ? "r+" : "r");
          await handle.close();
        }
      },
      catch: systemError("access", path),
    }),
  );

const makeDirectory = (
  path: string,
  options?: { readonly recursive?: boolean | undefined; readonly mode?: number | undefined },
) =>
  Effect.flatMap(getTjs("makeDirectory"), (tjs) =>
    Effect.tryPromise({
      try: () =>
        tjs.makeDir(path, {
          ...(options?.recursive === undefined ? {} : { recursive: options.recursive }),
          ...(options?.mode === undefined ? {} : { mode: options.mode }),
        }),
      catch: systemError("makeDirectory", path),
    }),
  );

const remove = (
  path: string,
  options?: { readonly recursive?: boolean | undefined; readonly force?: boolean | undefined },
) =>
  Effect.flatMap(getTjs("remove"), (tjs) =>
    Effect.tryPromise({
      try: async () => {
        try {
          await tjs.remove(path);
        } catch (cause) {
          if (
            options?.force &&
            typeof cause === "object" &&
            cause !== null &&
            "code" in cause &&
            String((cause as { code: unknown }).code) === "ENOENT"
          ) {
            return;
          }
          throw cause;
        }
      },
      catch: systemError("remove", path),
    }),
  );

const open: FileSystem.FileSystem["open"] = (path, options) =>
  Effect.acquireRelease(
    Effect.flatMap(getTjs("open"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.open(path, options?.flag ?? "r", options?.mode),
        catch: systemError("open", path),
      }),
    ),
    (handle) =>
      Effect.ignore(
        Effect.tryPromise({ try: () => handle.close(), catch: systemError("open", handle.path) }),
      ),
  ).pipe(Effect.map((handle) => makeHandle(handle, (options?.flag ?? "r").startsWith("a"))));

const writeFile: FileSystem.FileSystem["writeFile"] = (path, data, options) =>
  Effect.acquireUseRelease(
    Effect.flatMap(getTjs("writeFile"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.open(path, options?.flag ?? "w", options?.mode),
        catch: systemError("writeFile", path),
      }),
    ),
    (handle) => makeHandle(handle, (options?.flag ?? "w").startsWith("a")).writeAll(data),
    (handle) =>
      Effect.ignore(
        Effect.tryPromise({
          try: () => handle.close(),
          catch: systemError("writeFile", handle.path),
        }),
      ),
  );

const fileSystem = FileSystem.make({
  access,
  chmod: (path, mode) =>
    Effect.flatMap(getTjs("chmod"), (tjs) =>
      Effect.tryPromise({ try: () => tjs.chmod(path, mode), catch: systemError("chmod", path) }),
    ),
  chown: (path, uid, gid) =>
    Effect.flatMap(getTjs("chown"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.chown(path, uid, gid),
        catch: systemError("chown", path),
      }),
    ),
  copy: (fromPath, toPath, options) =>
    Effect.flatMap(getTjs("copy"), (tjs) =>
      Effect.tryPromise({
        try: () => copyRecursive(tjs, fromPath, toPath, options?.overwrite ?? false),
        catch: systemError("copy", fromPath),
      }),
    ),
  copyFile: (fromPath, toPath) =>
    Effect.flatMap(getTjs("copyFile"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.copyFile(fromPath, toPath),
        catch: systemError("copyFile", fromPath),
      }),
    ),
  link: (fromPath, toPath) =>
    Effect.flatMap(getTjs("link"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.link(fromPath, toPath),
        catch: systemError("link", fromPath),
      }),
    ),
  makeDirectory,
  makeTempDirectory: (options) =>
    Effect.flatMap(getTjs("makeTempDirectory"), (tjs) =>
      Effect.tryPromise({
        try: () =>
          tjs.makeTempDir(
            joinPath(options?.directory ?? tjs.tmpDir ?? ".", tempTemplate(options?.prefix)),
          ),
        catch: systemError("makeTempDirectory"),
      }),
    ),
  makeTempDirectoryScoped: (options) =>
    Effect.acquireRelease(
      Effect.flatMap(getTjs("makeTempDirectoryScoped"), (tjs) =>
        Effect.tryPromise({
          try: () =>
            tjs.makeTempDir(
              joinPath(options?.directory ?? tjs.tmpDir ?? ".", tempTemplate(options?.prefix)),
            ),
          catch: systemError("makeTempDirectoryScoped"),
        }),
      ),
      (path) => Effect.ignore(remove(path, { recursive: true, force: true })),
    ),
  makeTempFile: (options) =>
    Effect.flatMap(getTjs("makeTempFile"), (tjs) =>
      Effect.tryPromise({
        try: async () => {
          const handle = await tjs.makeTempFile(
            joinPath(options?.directory ?? tjs.tmpDir ?? ".", tempTemplate(options?.prefix)),
          );
          const path = await renameWithSuffix(tjs, handle.path, options?.suffix);
          await handle.close();
          return path;
        },
        catch: systemError("makeTempFile"),
      }),
    ),
  makeTempFileScoped: (options) =>
    Effect.acquireRelease(
      Effect.flatMap(getTjs("makeTempFileScoped"), (tjs) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await tjs.makeTempFile(
              joinPath(options?.directory ?? tjs.tmpDir ?? ".", tempTemplate(options?.prefix)),
            );
            const path = await renameWithSuffix(tjs, handle.path, options?.suffix);
            await handle.close();
            return path;
          },
          catch: systemError("makeTempFileScoped"),
        }),
      ),
      (path) => Effect.ignore(remove(path, { force: true })),
    ),
  open,
  readDirectory: (path, options) =>
    Effect.flatMap(getTjs("readDirectory"), (tjs) =>
      Effect.tryPromise({
        try: () => readDirectoryImpl(tjs, path, options?.recursive ?? false),
        catch: systemError("readDirectory", path),
      }),
    ),
  readFile: (path) =>
    Effect.flatMap(getTjs("readFile"), (tjs) =>
      Effect.tryPromise({ try: () => tjs.readFile(path), catch: systemError("readFile", path) }),
    ),
  readLink: (path) =>
    Effect.flatMap(getTjs("readLink"), (tjs) =>
      Effect.tryPromise({ try: () => tjs.readLink(path), catch: systemError("readLink", path) }),
    ),
  realPath: (path) =>
    Effect.flatMap(getTjs("realPath"), (tjs) =>
      Effect.tryPromise({ try: () => tjs.realPath(path), catch: systemError("realPath", path) }),
    ),
  remove,
  rename: (oldPath, newPath) =>
    Effect.flatMap(getTjs("rename"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.rename(oldPath, newPath),
        catch: systemError("rename", oldPath),
      }),
    ),
  stat: (path) =>
    Effect.flatMap(getTjs("stat"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.stat(path).then(makeInfo),
        catch: systemError("stat", path),
      }),
    ),
  symlink: (fromPath, toPath) =>
    Effect.flatMap(getTjs("symlink"), (tjs) =>
      Effect.tryPromise({
        try: () => tjs.symlink(fromPath, toPath),
        catch: systemError("symlink", fromPath),
      }),
    ),
  truncate: (path, length) =>
    Effect.acquireUseRelease(
      Effect.flatMap(getTjs("truncate"), (tjs) =>
        Effect.tryPromise({
          try: () => tjs.open(path, "r+"),
          catch: systemError("truncate", path),
        }),
      ),
      (handle) =>
        Effect.tryPromise({
          try: () => handle.truncate(length === undefined ? undefined : Number(length)),
          catch: systemError("truncate", path),
        }),
      (handle) =>
        Effect.ignore(
          Effect.tryPromise({ try: () => handle.close(), catch: systemError("truncate", path) }),
        ),
    ),
  utimes: (path, atime, mtime) =>
    Effect.flatMap(getTjs("utimes"), (tjs) =>
      Effect.tryPromise({
        try: () =>
          tjs.utime(
            path,
            atime instanceof Date ? atime : new Date(atime),
            mtime instanceof Date ? mtime : new Date(mtime),
          ),
        catch: systemError("utimes", path),
      }),
    ),
  watch: (path) =>
    Stream.callback<FileSystem.WatchEvent, PlatformError.PlatformError>(
      (queue) =>
        Effect.gen(function* () {
          const tjs = yield* getTjs("watch");
          const rootIsDirectory = yield* Effect.match(
            Effect.tryPromise({
              try: () => tjs.stat(path),
              catch: systemError("watch", path),
            }),
            {
              onFailure: () => false,
              onSuccess: (stat) => stat.isDirectory,
            },
          );
          const known = rootIsDirectory
            ? yield* Effect.tryPromise({
                try: () => readDirectoryEntries(tjs, path),
                catch: systemError("watch", path),
              })
            : new Set<string>();
          if (!rootIsDirectory) {
            const exists = yield* Effect.match(
              Effect.tryPromise({
                try: () => tjs.stat(path),
                catch: systemError("watch", path),
              }),
              {
                onFailure: () => false,
                onSuccess: () => true,
              },
            );
            if (exists) {
              known.add(path);
            }
          }
          const watcher = tjs.watch(path, (filename, _event) => {
            const target = rootIsDirectory && filename ? joinPath(path, filename) : path;
            void tjs.stat(target).then(
              () => {
                const existed = known.has(target);
                known.add(target);
                Queue.offerUnsafe(queue, {
                  _tag: existed ? "Update" : "Create",
                  path: target,
                });
              },
              (cause) => {
                const code =
                  typeof cause === "object" && cause !== null && "code" in cause
                    ? String((cause as { code: unknown }).code)
                    : "";
                if (known.has(target) && code === "ENOENT") {
                  known.delete(target);
                  Queue.offerUnsafe(queue, {
                    _tag: "Remove",
                    path: target,
                  });
                }
              },
            );
          });
          yield* Effect.addFinalizer(() => Effect.sync(() => watcher.close()));
        }),
      { bufferSize: 16 },
    ),
  writeFile,
});

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = Layer.succeed(FileSystem.FileSystem)(fileSystem);
