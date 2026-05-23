import { beforeEach, describe, expect, it } from "vitest";
import * as ConformanceCopy from "@effect-experimental/runtime-conformance/CopyContract";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as ConformanceFs from "@effect-experimental/runtime-conformance/FileSystemContract";
import * as ConformanceHandles from "@effect-experimental/runtime-conformance/FileHandleContract";
import * as ConformanceTemp from "@effect-experimental/runtime-conformance/TempContract";
import * as ConformanceWatch from "@effect-experimental/runtime-conformance/WatchContract";
import * as TxikiFileSystem from "../src/TxikiFileSystem.ts";

const files = new Map<string, Uint8Array>();
const dirs = new Set<string>();
const modes = new Map<string, number>();
const owners = new Map<string, { uid: number; gid: number }>();
let nextTemp = 0;
const permissionDeniedSuffix = "permission-denied.txt";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const makeCodeError = (code: string) => {
  const error = new Error(code) as Error & { code?: string };
  error.code = code;
  return error;
};

const makeDirHandle = (path: string, entries: Array<string>) => ({
  path,
  async close() {},
  [Symbol.asyncIterator]() {
    let index = 0;
    return {
      next: async () =>
        index < entries.length
          ? {
              done: false,
              value: {
                name: entries[index++]!,
                isBlockDevice: false,
                isCharacterDevice: false,
                isDirectory: false,
                isFIFO: false,
                isFile: true,
                isSocket: false,
                isSymbolicLink: false,
              },
            }
          : { done: true, value: undefined },
    };
  },
});

const makeStat = (path: string) => ({
  dev: 1,
  mode: modes.get(path) ?? (files.has(path) ? 0o100644 : 0o040755),
  nlink: 1,
  uid: owners.get(path)?.uid ?? 1,
  gid: owners.get(path)?.gid ?? 1,
  rdev: 0,
  ino: 1,
  size: files.get(path)?.byteLength ?? 0,
  blksize: 4096,
  blocks: 1,
  atim: new Date(0),
  mtim: new Date(0),
  ctim: new Date(0),
  birthtim: new Date(0),
  isBlockDevice: false,
  isCharacterDevice: false,
  isDirectory: !files.has(path),
  isFIFO: false,
  isFile: files.has(path),
  isSocket: false,
  isSymbolicLink: false,
});

beforeEach(() => {
  files.clear();
  dirs.clear();
  modes.clear();
  owners.clear();
  nextTemp = 0;
  dirs.add("/");
  dirs.add("/watched");
  modes.set("/", 0o040755);
  modes.set("/watched", 0o040755);
  owners.set("/", { uid: 1, gid: 1 });
  owners.set("/watched", { uid: 1, gid: 1 });
  (globalThis as typeof globalThis & { tjs?: unknown }).tjs = {
    tmpDir: "/tmp",
    realPath: async (path: string) => path,
    rename: async (path: string, newPath: string) => {
      const value = files.get(path);
      if (value) {
        files.delete(path);
        files.set(newPath, value);
      }
      if (modes.has(path)) {
        modes.set(newPath, modes.get(path)!);
        modes.delete(path);
      }
      if (owners.has(path)) {
        owners.set(newPath, owners.get(path)!);
        owners.delete(path);
      }
    },
    makeTempDir: async (template: string) => {
      const path = template.replace(/XXXXXX/g, `${nextTemp++}`.padStart(6, "0"));
      dirs.add(path);
      modes.set(path, 0o040755);
      owners.set(path, { uid: 1, gid: 1 });
      return path;
    },
    makeTempFile: async (template: string) => ({
      path: (() => {
        const path = template.replace(/XXXXXX/g, `${nextTemp++}`.padStart(6, "0"));
        files.set(path, new Uint8Array(0));
        modes.set(path, 0o100644);
        owners.set(path, { uid: 1, gid: 1 });
        return path;
      })(),
      readable: new ReadableStream<Uint8Array>(),
      writable: new WritableStream<Uint8Array>(),
      read: async () => null,
      write: async () => 0,
      close: async () => {},
      stat: async function () {
        return makeStat(this.path);
      },
      truncate: async () => {},
      datasync: async () => {},
      sync: async () => {},
      chmod: async () => {},
      utime: async () => {},
    }),
    stat: async (path: string) => {
      if (!files.has(path) && !dirs.has(path)) {
        throw makeCodeError("ENOENT");
      }
      return makeStat(path);
    },
    lstat: async (path: string) => {
      if (!files.has(path) && !dirs.has(path)) {
        throw makeCodeError("ENOENT");
      }
      return makeStat(path);
    },
    chmod: async (path: string, mode: number) => {
      modes.set(path, (files.has(path) ? 0o100000 : 0o040000) | mode);
    },
    chown: async (path: string, uid: number, gid: number) => {
      owners.set(path, { uid, gid });
    },
    utime: async () => {},
    open: async (path: string, flags = "r") => {
      if (path.endsWith(permissionDeniedSuffix)) {
        throw makeCodeError("EACCES");
      }
      let position = flags.startsWith("a") ? (files.get(path)?.byteLength ?? 0) : 0;
      let closed = false;
      return {
        path,
        readable: new ReadableStream<Uint8Array>(),
        writable: new WritableStream<Uint8Array>(),
        read: async (buffer: Uint8Array, offset = position) => {
          if (closed) throw makeCodeError("EBADF");
          const value = files.get(path);
          if (!value) return null;
          const slice = value.subarray(offset, offset + buffer.byteLength);
          buffer.set(slice);
          position = offset + slice.length;
          return slice.length;
        },
        write: async (buffer: Uint8Array, offset = position) => {
          if (closed) throw makeCodeError("EBADF");
          const current = files.get(path) ?? new Uint8Array(0);
          const nextSize = Math.max(current.byteLength, offset + buffer.byteLength);
          const merged = new Uint8Array(nextSize);
          merged.set(current);
          merged.set(buffer, offset);
          files.set(path, merged);
          modes.set(path, modes.get(path) ?? 0o100644);
          owners.set(path, owners.get(path) ?? { uid: 1, gid: 1 });
          position = offset + buffer.byteLength;
          return buffer.byteLength;
        },
        close: async () => {
          closed = true;
        },
        stat: async () => makeStat(path),
        truncate: async (offset = 0) => {
          if (closed) throw makeCodeError("EBADF");
          const current = files.get(path) ?? new Uint8Array(0);
          files.set(path, current.subarray(0, offset));
          position = Math.min(position, offset);
        },
        datasync: async () => {
          if (closed) throw makeCodeError("EBADF");
        },
        sync: async () => {
          if (closed) throw makeCodeError("EBADF");
        },
        chmod: async (mode: number) => {
          modes.set(path, 0o100000 | mode);
        },
        utime: async () => {},
      };
    },
    makeDir: async (path: string) => {
      dirs.add(path);
      modes.set(path, 0o040755);
      owners.set(path, { uid: 1, gid: 1 });
    },
    copyFile: async (path: string, newPath: string) => {
      files.set(newPath, new Uint8Array(files.get(path) ?? new Uint8Array(0)));
      modes.set(newPath, modes.get(path) ?? 0o100644);
      owners.set(newPath, owners.get(path) ?? { uid: 1, gid: 1 });
    },
    readDir: async (path: string) => {
      const prefix = path.endsWith("/") ? path : `${path}/`;
      const entries = [...files.keys()]
        .filter((file) => file.startsWith(prefix))
        .map((file) => file.slice(prefix.length));
      return makeDirHandle(path, entries);
    },
    readLink: async (path: string) => path,
    readFile: async (path: string) => files.get(path) ?? new Uint8Array(0),
    writeFile: async (path: string, data: string | Uint8Array) => {
      files.set(path, typeof data === "string" ? new TextEncoder().encode(data) : data);
      modes.set(path, modes.get(path) ?? 0o100644);
      owners.set(path, owners.get(path) ?? { uid: 1, gid: 1 });
    },
    remove: async (path: string) => {
      files.delete(path);
      dirs.delete(path);
      modes.delete(path);
      owners.delete(path);
      for (const file of [...files.keys()]) {
        if (file.startsWith(`${path}/`)) {
          files.delete(file);
          modes.delete(file);
          owners.delete(file);
        }
      }
      for (const dir of [...dirs]) {
        if (dir.startsWith(`${path}/`)) {
          dirs.delete(dir);
          modes.delete(dir);
          owners.delete(dir);
        }
      }
    },
    link: async (path: string, newPath: string) => {
      files.set(newPath, new Uint8Array(files.get(path) ?? new Uint8Array(0)));
      modes.set(newPath, modes.get(path) ?? 0o100644);
      owners.set(newPath, owners.get(path) ?? { uid: 1, gid: 1 });
    },
    symlink: async () => {},
    watch: (path: string, handler: (filename: string, event: "change" | "rename") => void) => {
      const first = `${path}/watched.txt`;
      const renamed = `${path}/renamed.txt`;
      setTimeout(() => {
        files.set(first, new TextEncoder().encode("one"));
        handler("watched.txt", "rename");
      }, 10);
      setTimeout(() => {
        files.set(first, new TextEncoder().encode("three"));
        handler("watched.txt", "change");
      }, 20);
      setTimeout(() => {
        files.delete(first);
        handler("watched.txt", "rename");
      }, 30);
      setTimeout(() => {
        files.set(renamed, new TextEncoder().encode("renamed"));
        handler("renamed.txt", "rename");
      }, 40);
      setTimeout(() => {
        files.delete(renamed);
        handler("renamed.txt", "rename");
      }, 50);
      return { path, close() {} };
    },
  };
});

describe("TxikiFileSystem", () => {
  it("satisfies the shared basic filesystem contract", async () => {
    await ConformanceFs.verifyBasicFileSystemLayer(TxikiFileSystem.layer, {
      directory: "/tmp-dir",
      fileName: "hello.txt",
      renamedFileName: "renamed.txt",
    });
  });

  it("satisfies the shared temp contract", async () => {
    await ConformanceTemp.verifyBasicTempLayer(TxikiFileSystem.layer, {
      prefix: "txiki-",
      suffix: ".tmp",
    });
  });

  it("satisfies the shared file-handle contract", async () => {
    await ConformanceHandles.verifyHostFileHandleLayer(TxikiFileSystem.layer, {
      directory: "/tmp-dir",
      fileName: "handle.txt",
      permissionDeniedPath: `/tmp-dir/${permissionDeniedSuffix}`,
    });
  });

  it("satisfies the shared copy contract", async () => {
    await ConformanceCopy.verifyBasicCopyLayer(TxikiFileSystem.layer, {
      directory: "/tmp-dir",
      sourceFileName: "source.txt",
      copiedFileName: "copy.txt",
      nestedDirectoryName: "nested",
      nestedFileName: "inside.txt",
      copiedDirectoryName: "nested-copy",
    });
  });

  it("supports stream, sink, link, and chmod", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const dir = "/tmp-dir/io";
        const file = `${dir}/sink.txt`;
        const link = `${dir}/sink-link.txt`;

        yield* fs.makeDirectory(dir, { recursive: true });
        yield* Stream.make(encoder.encode("sink "), encoder.encode("stream")).pipe(
          Stream.run(fs.sink(file)),
        );

        const streamed = yield* fs
          .stream(file, {
            offset: FileSystem.Size(5),
            bytesToRead: FileSystem.Size(6),
            chunkSize: FileSystem.Size(3),
          })
          .pipe(
            Stream.map((chunk) => decoder.decode(chunk)),
            Stream.runCollect,
            Effect.map((chunks) => Array.from(chunks).join("")),
          );
        expect(streamed).toBe("stream");

        yield* fs.link(file, link);
        const linked = yield* fs.readFile(link);
        expect(decoder.decode(linked)).toBe("sink stream");

        yield* fs.chmod(file, 0o600);
        const info = yield* fs.stat(file);
        expect(info.mode & 0o777).toBe(0o600);
      }).pipe(Effect.provide(TxikiFileSystem.layer)),
    );
  });

  it("supports chown and recursive cleanup", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const dir = "/tmp-dir/recursive";
        const nested = `${dir}/nested`;
        const file = `${nested}/owned.txt`;

        yield* fs.makeDirectory(nested, { recursive: true });
        yield* fs.writeFile(file, encoder.encode("owned"));
        yield* fs.chown(file, 123, 456);

        const info = yield* fs.stat(file);
        expect(Option.isSome(info.uid)).toBe(true);
        expect(Option.isSome(info.gid)).toBe(true);
        if (!Option.isSome(info.uid) || !Option.isSome(info.gid)) {
          throw new Error("chown stat did not preserve ownership");
        }
        expect(info.uid.value).toBe(123);
        expect(info.gid.value).toBe(456);

        yield* fs.remove(dir, { recursive: true, force: true });
        const exists = yield* fs.exists(file);
        expect(exists).toBe(false);
      }).pipe(Effect.provide(TxikiFileSystem.layer)),
    );
  });

  it("emits ordered watch events through the shared watch contract", async () => {
    await ConformanceWatch.verifyWatchSubsequenceLayer(TxikiFileSystem.layer, "/watched", [
      { _tag: "Create", path: "/watched/watched.txt" },
      { _tag: "Update", path: "/watched/watched.txt" },
      { _tag: "Remove", path: "/watched/watched.txt" },
    ]);
  });

  it("emits rename events through the shared watch contract", async () => {
    const dir = "/rename-watch";
    dirs.add(dir);
    modes.set(dir, 0o040755);
    owners.set(dir, { uid: 1, gid: 1 });
    const original = `${dir}/watched.txt`;
    const renamed = `${dir}/renamed.txt`;
    await ConformanceWatch.verifyWatchRenameLayer(TxikiFileSystem.layer, dir, original, renamed);
  });

  it("emits watch events for nested directories", async () => {
    const dir = "/nested-watch/deep";
    dirs.add("/nested-watch");
    modes.set("/nested-watch", 0o040755);
    owners.set("/nested-watch", { uid: 1, gid: 1 });
    dirs.add(dir);
    modes.set(dir, 0o040755);
    owners.set(dir, { uid: 1, gid: 1 });
    const file = `${dir}/renamed.txt`;
    await ConformanceWatch.verifyWatchChurnLayer(TxikiFileSystem.layer, dir, [
      { _tag: "Create", path: file },
      { _tag: "Remove", path: file },
    ]);
  });
});
