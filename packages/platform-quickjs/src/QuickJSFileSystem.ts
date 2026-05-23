/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as PlatformError from "effect/PlatformError";
import * as Queue from "effect/Queue";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";

interface QuickJSStat {
  readonly mode?: number;
  readonly dev?: number;
  readonly rdev?: number;
  readonly ino?: number;
  readonly nlink?: number;
  readonly uid?: number;
  readonly gid?: number;
  readonly size?: number;
  readonly blocks?: number;
  readonly atime?: number;
  readonly mtime?: number;
  readonly ctime?: number;
}

interface QuickJSOsModule {
  readonly stat: (path: string) => [QuickJSStat | null, number];
  readonly readdir: (path: string) => [Array<string>, number];
  readonly chmod?: (path: string, mode: number) => number;
  readonly chown?: (path: string, uid: number, gid: number) => number;
  readonly link?: (path: string, newPath: string) => number;
  readonly mkdir: (path: string, mode: number) => number;
  readonly mkdtemp?: (template: string) => [string | null, number];
  readonly mkstemp?: (template: string) => [string | null, number];
  readonly remove: (path: string) => number;
  readonly rename: (oldPath: string, newPath: string) => number;
  readonly symlink: (target: string, linkPath: string) => number;
  readonly readlink: (path: string) => [string | null, number];
  readonly realpath: (path: string) => [string | null, number];
  readonly utimes: (path: string, atime: number, mtime: number) => number;
  readonly open: (path: string, flags: number, mode: number) => number;
  readonly close: (fd: number) => number;
  readonly read: (fd: number, buffer: ArrayBuffer, offset: number, length: number) => number;
  readonly write: (fd: number, buffer: ArrayBuffer, offset: number, length: number) => number;
  readonly seek: (fd: number, offset: number, whence: number) => number;
  readonly ftruncate?: (fd: number, length: number) => number;
  readonly fsync?: (fd: number) => number;
  readonly SEEK_SET?: number;
  readonly SEEK_CUR?: number;
  readonly SEEK_END?: number;
}

declare const globalThis: {
  readonly os?: QuickJSOsModule;
  readonly setInterval?: (
    handler: (...args: Array<unknown>) => void,
    timeout?: number,
    ...args: Array<unknown>
  ) => unknown;
  readonly clearInterval?: (handle: unknown) => void;
};

const moduleError = (method: string, description: string) =>
  PlatformError.badArgument({
    module: "QuickJSFileSystem",
    method,
    description,
  });

const systemError = (method: string, pathOrDescriptor?: string | number) => (errno: number) =>
  PlatformError.systemError({
    _tag: errnoToTag(errno),
    module: "QuickJSFileSystem",
    method,
    pathOrDescriptor,
    description: `system error ${Math.abs(errno)}`,
  });

const errnoToTag = (errno: number): PlatformError.SystemErrorTag => {
  switch (Math.abs(errno)) {
    case 2:
      return "NotFound";
    case 13:
      return "PermissionDenied";
    case 17:
      return "AlreadyExists";
    case 20:
    case 21:
      return "BadResource";
    case 16:
      return "Busy";
    case 11:
      return "WouldBlock";
    case 9:
      return "BadResource";
    case 110:
      return "TimedOut";
    case 5:
      return "UnexpectedEof";
    case 28:
      return "WriteZero";
    default:
      return "Unknown";
  }
};

const getBackingBuffer = (buffer: Uint8Array): ArrayBuffer =>
  buffer.buffer instanceof ArrayBuffer ? buffer.buffer : new Uint8Array(buffer).buffer;

const joinPath = (left: string, right: string) =>
  left.endsWith("/") ? `${left}${right}` : `${left}/${right}`;
const tempBase = (directory?: string) => directory ?? "/tmp";
const tempTemplate = (prefix?: string, suffix = "") => `${prefix ?? "tmp"}XXXXXX${suffix}`;
const seekStart = (os: QuickJSOsModule) => os.SEEK_SET ?? 0;
const seekEnd = (os: QuickJSOsModule) => os.SEEK_END ?? 2;
const watchPollMs = 10;

const getOs = (method: string): Effect.Effect<QuickJSOsModule, PlatformError.PlatformError> =>
  globalThis.os
    ? Effect.succeed(globalThis.os)
    : Effect.fail(moduleError(method, "QuickJS os module not available"));

const makeInfo = (stat: QuickJSStat | null): FileSystem.File.Info => ({
  type: toFileType(stat?.mode),
  mtime: stat?.mtime === undefined ? Option.none() : Option.some(new Date(stat.mtime)),
  atime: stat?.atime === undefined ? Option.none() : Option.some(new Date(stat.atime)),
  birthtime: stat?.ctime === undefined ? Option.none() : Option.some(new Date(stat.ctime)),
  dev: stat?.dev ?? 0,
  rdev: stat?.rdev === undefined ? Option.none() : Option.some(stat.rdev),
  ino: stat?.ino === undefined ? Option.none() : Option.some(stat.ino),
  mode: stat?.mode ?? 0,
  nlink: stat?.nlink === undefined ? Option.none() : Option.some(stat.nlink),
  uid: stat?.uid === undefined ? Option.none() : Option.some(stat.uid),
  gid: stat?.gid === undefined ? Option.none() : Option.some(stat.gid),
  size: FileSystem.Size(stat?.size ?? 0),
  blksize: Option.none(),
  blocks: stat?.blocks === undefined ? Option.none() : Option.some(stat.blocks),
});

const toFileType = (mode: number | undefined): FileSystem.File.Type => {
  if (typeof mode !== "number") return "Unknown";
  switch (mode & 0o170000) {
    case 0o100000:
      return "File";
    case 0o040000:
      return "Directory";
    case 0o120000:
      return "SymbolicLink";
    case 0o060000:
      return "BlockDevice";
    case 0o020000:
      return "CharacterDevice";
    case 0o010000:
      return "FIFO";
    case 0o140000:
      return "Socket";
    default:
      return "Unknown";
  }
};

interface WatchEntry {
  readonly type: FileSystem.File.Type;
  readonly mtime: number | undefined;
  readonly size: number | undefined;
}

type WatchSnapshot =
  | { readonly _tag: "Missing" }
  | { readonly _tag: "File"; readonly entry: WatchEntry }
  | { readonly _tag: "Directory"; readonly entries: Map<string, WatchEntry> };

const watchEntryEquals = (left: WatchEntry, right: WatchEntry): boolean =>
  left.type === right.type && left.mtime === right.mtime && left.size === right.size;

const makeWatchEntry = (stat: QuickJSStat | null): WatchEntry => ({
  type: toFileType(stat?.mode),
  mtime: stat?.mtime,
  size: stat?.size,
});

const snapshotPath = (os: QuickJSOsModule, path: string): WatchSnapshot => {
  const [info, errno] = os.stat(path);
  if (errno !== 0 || info === null) {
    return { _tag: "Missing" };
  }

  const entry = makeWatchEntry(info);
  if (entry.type !== "Directory") {
    return { _tag: "File", entry };
  }

  const [entries, readdirErrno] = os.readdir(path);
  if (readdirErrno !== 0) {
    return { _tag: "Directory", entries: new Map() };
  }
  const map = new Map<string, WatchEntry>();
  for (const child of entries) {
    const childPath = joinPath(path, child);
    const [childInfo, childErrno] = os.stat(childPath);
    if (childErrno === 0 && childInfo !== null) {
      map.set(child, makeWatchEntry(childInfo));
    }
  }
  return { _tag: "Directory", entries: map };
};

const diffWatchSnapshots = (
  rootPath: string,
  previous: WatchSnapshot,
  current: WatchSnapshot,
): Array<FileSystem.WatchEvent> => {
  if (previous._tag === "File" || current._tag === "File") {
    if (previous._tag === "Missing" && current._tag === "File") {
      return [{ _tag: "Create", path: rootPath }];
    }
    if (previous._tag === "File" && current._tag === "Missing") {
      return [{ _tag: "Remove", path: rootPath }];
    }
    if (
      previous._tag === "File" &&
      current._tag === "File" &&
      !watchEntryEquals(previous.entry, current.entry)
    ) {
      return [{ _tag: "Update", path: rootPath }];
    }
    return [];
  }

  if (previous._tag === "Missing" && current._tag === "Directory") {
    return Array.from(
      current.entries.keys(),
      (child) => ({ _tag: "Create", path: joinPath(rootPath, child) }) as const,
    );
  }
  if (previous._tag === "Directory" && current._tag === "Missing") {
    return Array.from(
      previous.entries.keys(),
      (child) => ({ _tag: "Remove", path: joinPath(rootPath, child) }) as const,
    );
  }
  if (previous._tag !== "Directory" || current._tag !== "Directory") {
    return [];
  }

  const events: Array<FileSystem.WatchEvent> = [];
  const names = new Set([...previous.entries.keys(), ...current.entries.keys()]);
  for (const name of names) {
    const prev = previous.entries.get(name);
    const next = current.entries.get(name);
    const childPath = joinPath(rootPath, name);
    if (!prev && next) {
      events.push({ _tag: "Create", path: childPath });
    } else if (prev && !next) {
      events.push({ _tag: "Remove", path: childPath });
    } else if (prev && next && !watchEntryEquals(prev, next)) {
      events.push({ _tag: "Update", path: childPath });
    }
  }
  return events;
};

const flagToMode = (flag: FileSystem.OpenFlag): number => {
  switch (flag) {
    case "r":
      return 0;
    case "r+":
      return 2;
    case "w":
      return 1 | 64 | 512;
    case "wx":
      return 1 | 64 | 512 | 128;
    case "w+":
      return 2 | 64 | 512;
    case "wx+":
      return 2 | 64 | 512 | 128;
    case "a":
      return 1 | 64 | 1024;
    case "ax":
      return 1 | 64 | 1024 | 128;
    case "a+":
      return 2 | 64 | 1024;
    case "ax+":
      return 2 | 64 | 1024 | 128;
  }
};

const access: FileSystem.FileSystem["access"] = (path, options) =>
  Effect.gen(function* () {
    const os = yield* getOs("access");
    const [_, errno] = os.stat(path);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("access", path)(errno));
    }
    if (options?.readable || options?.writable) {
      const fd = os.open(path, flagToMode(options.writable ? "r+" : "r"), 0o666);
      if (fd < 0) {
        return yield* Effect.fail(systemError("access", path)(fd));
      }
      os.close(fd);
    }
  });

const stat: FileSystem.FileSystem["stat"] = (path) =>
  Effect.gen(function* () {
    const os = yield* getOs("stat");
    const [info, errno] = os.stat(path);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("stat", path)(errno));
    }
    return makeInfo(info);
  });

const readDirectoryRecursive = (
  os: QuickJSOsModule,
  path: string,
): Effect.Effect<Array<string>, PlatformError.PlatformError> =>
  Effect.gen(function* () {
    const [entries, errno] = os.readdir(path);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("readDirectory", path)(errno));
    }
    const out: Array<string> = [];
    for (const entry of entries) {
      out.push(entry);
      const childPath = joinPath(path, entry);
      const [childStat, childErrno] = os.stat(childPath);
      if (childErrno === 0 && toFileType(childStat?.mode) === "Directory") {
        const nested = yield* readDirectoryRecursive(os, childPath);
        for (const item of nested) {
          out.push(`${entry}/${item}`);
        }
      }
    }
    return out;
  });

const readDirectory: FileSystem.FileSystem["readDirectory"] = (path, options) =>
  Effect.gen(function* () {
    const os = yield* getOs("readDirectory");
    if (options?.recursive) {
      return yield* readDirectoryRecursive(os, path);
    }
    const [entries, errno] = os.readdir(path);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("readDirectory", path)(errno));
    }
    return entries;
  });

const makeDirectory: FileSystem.FileSystem["makeDirectory"] = (path, options) =>
  Effect.gen(function* () {
    const os = yield* getOs("makeDirectory");
    if (!options?.recursive) {
      const errno = os.mkdir(path, options?.mode ?? 0o777);
      if (errno !== 0) {
        return yield* Effect.fail(systemError("makeDirectory", path)(errno));
      }
      return;
    }
    const segments = path.split("/").filter(Boolean);
    let current = path.startsWith("/") ? "/" : ".";
    for (const segment of segments) {
      current = current === "/" ? `/${segment}` : `${current}/${segment}`;
      const errno = os.mkdir(current, options?.mode ?? 0o777);
      if (errno !== 0 && Math.abs(errno) !== 17) {
        return yield* Effect.fail(systemError("makeDirectory", current)(errno));
      }
    }
  });

const removeRecursive = (
  os: QuickJSOsModule,
  path: string,
): Effect.Effect<void, PlatformError.PlatformError> =>
  Effect.gen(function* () {
    const [info, errno] = os.stat(path);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("remove", path)(errno));
    }
    if (toFileType(info?.mode) === "Directory") {
      const [entries, readdirErrno] = os.readdir(path);
      if (readdirErrno !== 0) {
        return yield* Effect.fail(systemError("remove", path)(readdirErrno));
      }
      for (const entry of entries) {
        yield* removeRecursive(os, joinPath(path, entry));
      }
    }
    const removeErrno = os.remove(path);
    if (removeErrno !== 0) {
      return yield* Effect.fail(systemError("remove", path)(removeErrno));
    }
  });

const remove: FileSystem.FileSystem["remove"] = (path, options) =>
  Effect.gen(function* () {
    const os = yield* getOs("remove");
    if (options?.recursive) {
      return yield* Effect.matchEffect(removeRecursive(os, path), {
        onFailure: (error) =>
          options?.force && error.reason._tag === "NotFound" ? Effect.void : Effect.fail(error),
        onSuccess: () => Effect.void,
      });
    }
    const errno = os.remove(path);
    if (errno !== 0 && !(options?.force && Math.abs(errno) === 2)) {
      return yield* Effect.fail(systemError("remove", path)(errno));
    }
  });

const rename: FileSystem.FileSystem["rename"] = (oldPath, newPath) =>
  Effect.gen(function* () {
    const os = yield* getOs("rename");
    const errno = os.rename(oldPath, newPath);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("rename", oldPath)(errno));
    }
  });

const readFile: FileSystem.FileSystem["readFile"] = (path) =>
  Effect.gen(function* () {
    const os = yield* getOs("readFile");
    const fd = os.open(path, flagToMode("r"), 0o666);
    if (fd < 0) {
      return yield* Effect.fail(systemError("readFile", path)(fd));
    }
    try {
      const chunks: Array<Uint8Array> = [];
      while (true) {
        const chunk = new Uint8Array(64 * 1024);
        const bytesRead = os.read(fd, chunk.buffer, 0, chunk.byteLength);
        if (bytesRead < 0) {
          return yield* Effect.fail(systemError("readFile", path)(bytesRead));
        }
        if (bytesRead === 0) {
          break;
        }
        chunks.push(chunk.subarray(0, bytesRead));
      }
      const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
      const merged = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return merged;
    } finally {
      os.close(fd);
    }
  });

const writeFile: FileSystem.FileSystem["writeFile"] = (path, data, options) =>
  Effect.gen(function* () {
    const os = yield* getOs("writeFile");
    const fd = os.open(path, flagToMode(options?.flag ?? "w"), options?.mode ?? 0o666);
    if (fd < 0) {
      return yield* Effect.fail(systemError("writeFile", path)(fd));
    }
    try {
      let offset = 0;
      while (offset < data.byteLength) {
        const written = os.write(
          fd,
          getBackingBuffer(data),
          data.byteOffset + offset,
          data.byteLength - offset,
        );
        if (written < 0) {
          return yield* Effect.fail(systemError("writeFile", path)(written));
        }
        if (written === 0) {
          return yield* Effect.fail(
            PlatformError.systemError({
              _tag: "WriteZero",
              module: "QuickJSFileSystem",
              method: "writeFile",
              pathOrDescriptor: path,
              description: "write returned 0 bytes",
            }),
          );
        }
        offset += written;
      }
    } finally {
      os.close(fd);
    }
  });

const readLink: FileSystem.FileSystem["readLink"] = (path) =>
  Effect.gen(function* () {
    const os = yield* getOs("readLink");
    const [target, errno] = os.readlink(path);
    if (errno !== 0 || target === null) {
      return yield* Effect.fail(systemError("readLink", path)(errno === 0 ? -2 : errno));
    }
    return target;
  });

const realPath: FileSystem.FileSystem["realPath"] = (path) =>
  Effect.gen(function* () {
    const os = yield* getOs("realPath");
    const [resolved, errno] = os.realpath(path);
    if (errno !== 0 || resolved === null) {
      return yield* Effect.fail(systemError("realPath", path)(errno === 0 ? -2 : errno));
    }
    return resolved;
  });

const symlink: FileSystem.FileSystem["symlink"] = (fromPath, toPath) =>
  Effect.gen(function* () {
    const os = yield* getOs("symlink");
    const errno = os.symlink(fromPath, toPath);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("symlink", fromPath)(errno));
    }
  });

const chmod: FileSystem.FileSystem["chmod"] = (path, mode) =>
  Effect.gen(function* () {
    const os = yield* getOs("chmod");
    if (!os.chmod) {
      return yield* Effect.fail(moduleError("chmod", "chmod is not available in the host"));
    }
    const errno = os.chmod(path, mode);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("chmod", path)(errno));
    }
  });

const chown: FileSystem.FileSystem["chown"] = (path, uid, gid) =>
  Effect.gen(function* () {
    const os = yield* getOs("chown");
    if (!os.chown) {
      return yield* Effect.fail(moduleError("chown", "chown is not available in the host"));
    }
    const errno = os.chown(path, uid, gid);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("chown", path)(errno));
    }
  });

const link: FileSystem.FileSystem["link"] = (fromPath, toPath) =>
  Effect.gen(function* () {
    const os = yield* getOs("link");
    if (!os.link) {
      return yield* Effect.fail(moduleError("link", "link is not available in the host"));
    }
    const errno = os.link(fromPath, toPath);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("link", fromPath)(errno));
    }
  });

const truncate: FileSystem.FileSystem["truncate"] = (path, length) =>
  Effect.gen(function* () {
    const os = yield* getOs("truncate");
    if (!os.ftruncate) {
      return yield* Effect.fail(moduleError("truncate", "ftruncate is not available in the host"));
    }
    const fd = os.open(path, flagToMode("r+"), 0o666);
    if (fd < 0) {
      return yield* Effect.fail(systemError("truncate", path)(fd));
    }
    try {
      const errno = os.ftruncate(fd, Number(length ?? 0));
      if (errno !== 0) {
        return yield* Effect.fail(systemError("truncate", path)(errno));
      }
    } finally {
      os.close(fd);
    }
  });

const utimes: FileSystem.FileSystem["utimes"] = (path, atime, mtime) =>
  Effect.gen(function* () {
    const os = yield* getOs("utimes");
    const errno = os.utimes(
      path,
      typeof atime === "number" ? atime : atime.getTime(),
      typeof mtime === "number" ? mtime : mtime.getTime(),
    );
    if (errno !== 0) {
      return yield* Effect.fail(systemError("utimes", path)(errno));
    }
  });

const copyFile: FileSystem.FileSystem["copyFile"] = (fromPath, toPath) =>
  Effect.gen(function* () {
    const bytes = yield* readFile(fromPath);
    yield* writeFile(toPath, bytes);
  });

const copyRecursive = (
  os: QuickJSOsModule,
  fromPath: string,
  toPath: string,
): Effect.Effect<void, PlatformError.PlatformError> =>
  Effect.gen(function* () {
    const [info, errno] = os.stat(fromPath);
    if (errno !== 0) {
      return yield* Effect.fail(systemError("copy", fromPath)(errno));
    }
    const type = toFileType(info?.mode);
    if (type === "Directory") {
      yield* makeDirectory(toPath, { recursive: true });
      const [entries, readdirErrno] = os.readdir(fromPath);
      if (readdirErrno !== 0) {
        return yield* Effect.fail(systemError("copy", fromPath)(readdirErrno));
      }
      for (const entry of entries) {
        yield* copyRecursive(os, joinPath(fromPath, entry), joinPath(toPath, entry));
      }
      return;
    }
    if (type === "SymbolicLink") {
      const target = yield* readLink(fromPath);
      yield* symlink(target, toPath);
      return;
    }
    yield* copyFile(fromPath, toPath);
  });

const copy: FileSystem.FileSystem["copy"] = (fromPath, toPath, options) =>
  Effect.gen(function* () {
    if (options?.overwrite === false) {
      const exists = yield* Effect.match(stat(toPath), {
        onFailure: () => false,
        onSuccess: () => true,
      });
      if (exists) {
        return yield* Effect.fail(
          PlatformError.systemError({
            _tag: "AlreadyExists",
            module: "QuickJSFileSystem",
            method: "copy",
            pathOrDescriptor: toPath,
            description: "target already exists",
          }),
        );
      }
    }
    const os = yield* getOs("copy");
    yield* copyRecursive(os, fromPath, toPath);
  });

const makeTempDirectory: FileSystem.FileSystem["makeTempDirectory"] = (options) =>
  Effect.gen(function* () {
    const os = yield* getOs("makeTempDirectory");
    if (!os.mkdtemp) {
      return yield* Effect.fail(
        moduleError("makeTempDirectory", "mkdtemp is not available in the host"),
      );
    }
    const [path, errno] = os.mkdtemp(
      joinPath(tempBase(options?.directory), tempTemplate(options?.prefix)),
    );
    if (errno !== 0 || path === null) {
      return yield* Effect.fail(systemError("makeTempDirectory")(errno === 0 ? -2 : errno));
    }
    return path;
  });

const makeTempDirectoryScoped: FileSystem.FileSystem["makeTempDirectoryScoped"] = (options) =>
  Effect.acquireRelease(makeTempDirectory(options), (path) =>
    Effect.ignore(remove(path, { recursive: true, force: true })),
  );

const makeTempFile: FileSystem.FileSystem["makeTempFile"] = (options) =>
  Effect.gen(function* () {
    const os = yield* getOs("makeTempFile");
    if (!os.mkstemp) {
      return yield* Effect.fail(
        moduleError("makeTempFile", "mkstemp is not available in the host"),
      );
    }
    const [path, errno] = os.mkstemp(
      joinPath(tempBase(options?.directory), tempTemplate(options?.prefix, options?.suffix ?? "")),
    );
    if (errno !== 0 || path === null) {
      return yield* Effect.fail(systemError("makeTempFile")(errno === 0 ? -2 : errno));
    }
    return path;
  });

const makeTempFileScoped: FileSystem.FileSystem["makeTempFileScoped"] = (options) =>
  Effect.acquireRelease(makeTempFile(options), (path) =>
    Effect.ignore(remove(path, { force: true })),
  );

const open: FileSystem.FileSystem["open"] = (path, options) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const os = yield* getOs("open");
      const append = (options?.flag ?? "r").startsWith("a");
      const fd = os.open(path, flagToMode(options?.flag ?? "r"), options?.mode ?? 0o666);
      if (fd < 0) {
        return yield* Effect.fail(systemError("open", path)(fd));
      }
      let cursor = 0;
      const file: FileSystem.File = {
        [FileSystem.FileTypeId]: FileSystem.FileTypeId,
        fd: FileSystem.FileDescriptor(fd),
        stat: Effect.map(stat(path), (info) => info),
        seek(offset, from) {
          const next = Number(offset);
          return Effect.sync(() => {
            if (from === "start") {
              cursor = Math.max(next, 0);
            } else {
              cursor = Math.max(cursor + next, 0);
            }
            return FileSystem.Size(cursor);
          });
        },
        sync: os.fsync
          ? Effect.gen(function* () {
              const errno = os.fsync?.(fd) ?? 0;
              if (errno !== 0) {
                return yield* Effect.fail(systemError("sync", fd)(errno));
              }
            })
          : Effect.fail(moduleError("sync", "fsync is not available in the host")),
        read(buffer) {
          return Effect.gen(function* () {
            const seekResult = os.seek(fd, cursor, seekStart(os));
            if (seekResult < 0) {
              return yield* Effect.fail(systemError("read", path)(seekResult));
            }
            const bytesRead = os.read(
              fd,
              getBackingBuffer(buffer),
              buffer.byteOffset,
              buffer.byteLength,
            );
            if (bytesRead < 0) {
              return yield* Effect.fail(systemError("read", path)(bytesRead));
            }
            cursor += bytesRead;
            return FileSystem.Size(bytesRead);
          });
        },
        readAlloc(size) {
          return Effect.gen(function* () {
            const buffer = new Uint8Array(Number(size));
            const seekResult = os.seek(fd, cursor, seekStart(os));
            if (seekResult < 0) {
              return yield* Effect.fail(systemError("readAlloc", path)(seekResult));
            }
            const bytesRead = os.read(fd, buffer.buffer, 0, buffer.byteLength);
            if (bytesRead < 0) {
              return yield* Effect.fail(systemError("readAlloc", path)(bytesRead));
            }
            if (bytesRead === 0) {
              return Option.none<Uint8Array>();
            }
            cursor += bytesRead;
            return Option.some(buffer.subarray(0, bytesRead));
          });
        },
        truncate(length) {
          return Effect.gen(function* () {
            if (!os.ftruncate) {
              return yield* Effect.fail(
                moduleError("truncate", "ftruncate is not available in the host"),
              );
            }
            const errno = os.ftruncate(fd, Number(length ?? 0));
            if (errno !== 0) {
              return yield* Effect.fail(systemError("truncate", path)(errno));
            }
            if (cursor > Number(length ?? 0)) {
              cursor = Number(length ?? 0);
            }
          });
        },
        write(buffer) {
          return Effect.gen(function* () {
            const targetOffset = append
              ? os.seek(fd, 0, seekEnd(os))
              : os.seek(fd, cursor, seekStart(os));
            if (targetOffset < 0) {
              return yield* Effect.fail(systemError("write", path)(targetOffset));
            }
            let localOffset = 0;
            while (localOffset < buffer.byteLength) {
              const written = os.write(
                fd,
                getBackingBuffer(buffer),
                buffer.byteOffset + localOffset,
                buffer.byteLength - localOffset,
              );
              if (written < 0) {
                return yield* Effect.fail(systemError("write", path)(written));
              }
              if (written === 0) {
                return yield* Effect.fail(
                  PlatformError.systemError({
                    _tag: "WriteZero",
                    module: "QuickJSFileSystem",
                    method: "write",
                    pathOrDescriptor: path,
                    description: "write returned 0 bytes",
                  }),
                );
              }
              localOffset += written;
              if (!append) {
                cursor += written;
              }
            }
            return FileSystem.Size(localOffset);
          });
        },
        writeAll(buffer) {
          return Effect.asVoid(this.write(buffer));
        },
      };
      return { fd, os, file } as const;
    }),
    ({ fd, os }) =>
      Effect.sync(() => {
        os.close(fd);
      }),
  ).pipe(Effect.map(({ file }) => file));

const stream: FileSystem.FileSystem["stream"] = (path, options) =>
  Stream.scoped(
    Stream.fromPull(
      Effect.gen(function* () {
        const file = yield* open(path, { flag: "r" });
        const chunkSize = Math.max(1, Number(FileSystem.Size(options?.chunkSize ?? 64 * 1024)));
        let remaining =
          options?.bytesToRead === undefined
            ? undefined
            : Math.max(0, Number(FileSystem.Size(options.bytesToRead)));

        if (options?.offset !== undefined) {
          yield* file.seek(options.offset, "start");
        }

        return Effect.gen(function* () {
          if (remaining !== undefined && remaining <= 0) {
            return yield* Cause.done();
          }

          const nextSize = remaining === undefined ? chunkSize : Math.min(chunkSize, remaining);
          const chunk = yield* file.readAlloc(FileSystem.Size(nextSize));
          if (Option.isNone(chunk)) {
            return yield* Cause.done();
          }

          if (remaining !== undefined) {
            remaining = remaining - chunk.value.byteLength;
          }

          return [chunk.value] as const;
        });
      }),
    ),
  );

const sink: FileSystem.FileSystem["sink"] = (path, options) => {
  let firstWrite = true;
  return Sink.forEach((chunk: Uint8Array) => {
    const flag = firstWrite ? (options?.flag ?? "w") : "a";
    firstWrite = false;
    return writeFile(path, chunk, {
      flag,
      ...(options?.mode === undefined ? {} : { mode: options.mode }),
    });
  });
};

const fileSystem = FileSystem.makeNoop({
  access,
  exists: (path) => Effect.match(access(path), { onFailure: () => false, onSuccess: () => true }),
  readDirectory,
  makeDirectory,
  readFile,
  writeFile,
  readLink,
  realPath,
  remove,
  rename,
  stat,
  symlink,
  truncate,
  utimes,
  copy,
  copyFile,
  chmod,
  chown,
  link,
  makeTempDirectory,
  makeTempDirectoryScoped,
  makeTempFile,
  makeTempFileScoped,
  open,
  sink,
  stream,
  watch: (path) =>
    Stream.callback<FileSystem.WatchEvent, PlatformError.PlatformError>(
      (queue) =>
        Effect.gen(function* () {
          const os = yield* getOs("watch");
          if (
            typeof globalThis.setInterval !== "function" ||
            typeof globalThis.clearInterval !== "function"
          ) {
            return yield* Effect.fail(moduleError("watch", "timer globals are not available"));
          }
          let previous = snapshotPath(os, path);
          const handle = globalThis.setInterval(() => {
            const current = snapshotPath(os, path);
            const events = diffWatchSnapshots(path, previous, current);
            previous = current;
            for (const event of events) {
              Queue.offerUnsafe(queue, event);
            }
          }, watchPollMs);
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              globalThis.clearInterval?.(handle);
            }),
          );
        }),
      { bufferSize: 16 },
    ),
});

/**
 * @since 1.0.0
 */
export const layer = Layer.succeed(FileSystem.FileSystem)(fileSystem);
