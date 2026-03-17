import { beforeEach, describe, expect, it } from "vitest"
import * as ConformanceCopy from "@effect-experimental/runtime-conformance/CopyContract"
import * as ConformanceFs from "@effect-experimental/runtime-conformance/FileSystemContract"
import * as ConformanceHandles from "@effect-experimental/runtime-conformance/FileHandleContract"
import * as ConformanceTemp from "@effect-experimental/runtime-conformance/TempContract"
import * as ConformanceWatch from "@effect-experimental/runtime-conformance/WatchContract"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Stream from "effect/Stream"
import * as QuickJSFileSystem from "../src/QuickJSFileSystem.ts"

type QuickJSStat = {
  mode: number
  dev: number
  rdev: number
  ino: number
  nlink: number
  uid: number
  gid: number
  size: number
  blocks: number
  atime: number
  mtime: number
  ctime: number
}

const files = new Map<string, Uint8Array>()
const dirs = new Set<string>()
const handles = new Map<number, { path: string; position: number }>()
const modes = new Map<string, number>()
let nextFd = 3
let nextTemp = 0
const permissionDeniedSuffix = "permission-denied.txt"
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const parentDir = (path: string) => {
  const normalized = path.replace(/[\\/]+$/, "")
  const index = normalized.lastIndexOf("/")
  return index <= 0 ? "/" : normalized.slice(0, index)
}

const makeStat = (path: string): QuickJSStat => ({
  mode: modes.get(path) ?? (files.has(path) ? 0o100644 : 0o040755),
  dev: 1,
  rdev: 0,
  ino: 1,
  nlink: 1,
  uid: 1,
  gid: 1,
  size: files.get(path)?.byteLength ?? 0,
  blocks: 1,
  atime: 0,
  mtime: 0,
  ctime: 0
})

beforeEach(() => {
  files.clear()
  dirs.clear()
  handles.clear()
  modes.clear()
  nextFd = 3
  nextTemp = 0
  dirs.add("/")
  modes.set("/", 0o040755)
  ;(globalThis as typeof globalThis & { os?: unknown }).os = {
    stat(path: string) {
      if (files.has(path) || dirs.has(path)) {
        return [makeStat(path), 0]
      }
      return [null, -2]
    },
    readdir(path: string) {
      const prefix = path.endsWith("/") ? path : `${path}/`
      const entries = new Set<string>()
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) {
          const tail = file.slice(prefix.length).split("/")[0]
          if (tail) entries.add(tail)
        }
      }
      for (const dir of dirs) {
        if (dir.startsWith(prefix) && dir !== path) {
          const tail = dir.slice(prefix.length).split("/")[0]
          if (tail) entries.add(tail)
        }
      }
      return [[...entries], 0]
    },
    mkdir(path: string) {
      dirs.add(path)
      modes.set(path, 0o040755)
      return 0
    },
    mkdtemp(template: string) {
      const path = template.replace(/XXXXXX/g, `${nextTemp++}`.padStart(6, "0"))
      dirs.add(path)
      modes.set(path, 0o040755)
      return [path, 0]
    },
    mkstemp(template: string) {
      const path = template.replace(/XXXXXX/g, `${nextTemp++}`.padStart(6, "0"))
      files.set(path, new Uint8Array(0))
      modes.set(path, 0o100644)
      return [path, 0]
    },
    remove(path: string) {
      files.delete(path)
      modes.delete(path)
      for (const file of [...files.keys()]) {
        if (file.startsWith(`${path}/`)) {
          files.delete(file)
          modes.delete(file)
        }
      }
      dirs.delete(path)
      for (const dir of [...dirs]) {
        if (dir.startsWith(`${path}/`)) {
          dirs.delete(dir)
          modes.delete(dir)
        }
      }
      return 0
    },
    rename(oldPath: string, newPath: string) {
      const file = files.get(oldPath)
      if (file) {
        files.delete(oldPath)
        files.set(newPath, file)
      }
      if (dirs.has(oldPath)) {
        dirs.delete(oldPath)
        dirs.add(newPath)
      }
      if (modes.has(oldPath)) {
        modes.set(newPath, modes.get(oldPath)!)
        modes.delete(oldPath)
      }
      return 0
    },
    chmod(path: string, mode: number) {
      if (!files.has(path) && !dirs.has(path)) {
        return -2
      }
      modes.set(path, (files.has(path) ? 0o100000 : 0o040000) | mode)
      return 0
    },
    chown(path: string) {
      return files.has(path) || dirs.has(path) ? 0 : -2
    },
    link(path: string, newPath: string) {
      const value = files.get(path)
      if (!value) {
        return -2
      }
      files.set(newPath, new Uint8Array(value))
      modes.set(newPath, modes.get(path) ?? 0o100644)
      return 0
    },
    symlink() {
      return 0
    },
    readlink(path: string) {
      return [path, 0]
    },
    realpath(path: string) {
      return [path, 0]
    },
    utimes() {
      return 0
    },
    open(path: string, flags = 0) {
      const dir = parentDir(path)
      if (!dirs.has(dir) && dir !== ".") {
        return -2
      }
      if (path.endsWith(permissionDeniedSuffix)) {
        return -13
      }
      if (!files.has(path)) {
        files.set(path, new Uint8Array(0))
        modes.set(path, 0o100644)
      }
      const fd = nextFd++
      handles.set(fd, { path, position: (flags & 1024) !== 0 ? (files.get(path)?.byteLength ?? 0) : 0 })
      return fd
    },
    close(fd: number) {
      handles.delete(fd)
      return 0
    },
    read(fd: number, buffer: ArrayBuffer, _offset: number, length: number) {
      const handle = handles.get(fd)
      if (!handle) return -9
      const target = files.get(handle.path) ?? new Uint8Array(0)
      const bytes = new Uint8Array(buffer)
      const slice = target.subarray(handle.position, handle.position + length)
      bytes.set(slice.subarray(0, bytes.byteLength))
      handle.position += slice.length
      return slice.length
    },
    write(fd: number, buffer: ArrayBuffer, offset: number, length: number) {
      const handle = handles.get(fd)
      if (!handle) return -9
      const bytes = new Uint8Array(buffer, offset, length)
      const current = files.get(handle.path) ?? new Uint8Array(0)
      const nextSize = Math.max(current.byteLength, handle.position + bytes.byteLength)
      const merged = new Uint8Array(nextSize)
      merged.set(current)
      merged.set(bytes, handle.position)
      files.set(handle.path, merged)
      handle.position += length
      return length
    },
    seek(fd: number, position: number, whence: number) {
      const handle = handles.get(fd)
      if (!handle) return -9
      if (whence === 0) {
        handle.position = position
      } else if (whence === 2) {
        handle.position = (files.get(handle.path)?.byteLength ?? 0) + position
      } else {
        handle.position += position
      }
      return handle.position
    },
    ftruncate(fd: number, length: number) {
      const handle = handles.get(fd)
      if (!handle) return -9
      const current = files.get(handle.path) ?? new Uint8Array(0)
      files.set(handle.path, current.subarray(0, length))
      return 0
    },
    fsync(fd: number) {
      return handles.has(fd) ? 0 : -9
    },
    SEEK_SET: 0,
    SEEK_CUR: 1,
    SEEK_END: 2
  }
})

describe("QuickJSFileSystem", () => {
  it("satisfies the shared basic filesystem contract with a mocked host", async () => {
    await ConformanceFs.verifyBasicFileSystemLayer(QuickJSFileSystem.layer, {
      directory: "/tmp-runtime-conformance",
      fileName: "hello.txt",
      renamedFileName: "renamed.txt"
    })
  })

  it("satisfies the shared temp contract with a mocked host", async () => {
    await ConformanceTemp.verifyBasicTempLayer(QuickJSFileSystem.layer, {
      prefix: "quickjs-",
      suffix: ".tmp"
    })
  })

  it("satisfies the shared file-handle contract with a mocked host", async () => {
    await ConformanceHandles.verifyHostFileHandleLayer(QuickJSFileSystem.layer, {
      directory: "/tmp-runtime-conformance",
      fileName: "handle.txt",
      permissionDeniedPath: `/tmp-runtime-conformance/${permissionDeniedSuffix}`
    })
  })

  it("satisfies the shared copy contract with a mocked host", async () => {
    await ConformanceCopy.verifyBasicCopyLayer(QuickJSFileSystem.layer, {
      directory: "/tmp-runtime-conformance",
      sourceFileName: "source.txt",
      copiedFileName: "copy.txt",
      nestedDirectoryName: "nested",
      nestedFileName: "inside.txt",
      copiedDirectoryName: "nested-copy"
    })
  })

  it("supports stream, sink, link, and chmod with a mocked host", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = "/tmp-runtime-conformance/io"
        const file = `${dir}/sink.txt`
        const link = `${dir}/sink-link.txt`

        yield* fs.makeDirectory(dir, { recursive: true })
        yield* Stream.make(
          encoder.encode("sink "),
          encoder.encode("stream")
        ).pipe(Stream.run(fs.sink(file)))

        const streamed = yield* fs.stream(file, {
          offset: FileSystem.Size(5),
          bytesToRead: FileSystem.Size(6),
          chunkSize: FileSystem.Size(3)
        }).pipe(
          Stream.map((chunk) => decoder.decode(chunk)),
          Stream.runCollect,
          Effect.map((chunks) => Array.from(chunks).join(""))
        )
        expect(streamed).toBe("stream")

        yield* fs.link(file, link)
        const linked = yield* fs.readFile(link)
        expect(decoder.decode(linked)).toBe("sink stream")

        yield* fs.chmod(file, 0o600)
        const info = yield* fs.stat(file)
        expect(info.mode & 0o777).toBe(0o600)
      }).pipe(Effect.provide(QuickJSFileSystem.layer))
    )
  })

  it("emits ordered create/update/remove events through the shared watch contract", async () => {
    const dir = "/tmp-runtime-conformance/watch"
    dirs.add(dir)
    const file = `${dir}/watched.txt`

    setTimeout(() => {
      files.set(file, new TextEncoder().encode("one"))
    }, 20)
    setTimeout(() => {
      files.set(file, new TextEncoder().encode("three"))
    }, 40)
    setTimeout(() => {
      files.set(file, new TextEncoder().encode("seven-seven"))
    }, 60)
    setTimeout(() => {
      files.delete(file)
    }, 80)

    await ConformanceWatch.verifyWatchSubsequenceLayer(
      QuickJSFileSystem.layer,
      dir,
      [
        { _tag: "Create", path: file },
        { _tag: "Update", path: file },
        { _tag: "Update", path: file },
        { _tag: "Remove", path: file }
      ]
    )
  })

  it("emits rename events through the shared watch contract", async () => {
    const dir = "/tmp-runtime-conformance/watch-rename"
    dirs.add(dir)
    const original = `${dir}/original.txt`
    const renamed = `${dir}/renamed.txt`

    setTimeout(() => {
      files.set(original, new TextEncoder().encode("one"))
    }, 10)
    setTimeout(() => {
      const value = files.get(original) ?? new Uint8Array(0)
      files.delete(original)
      files.set(renamed, value)
    }, 20)

    await ConformanceWatch.verifyWatchRenameLayer(
      QuickJSFileSystem.layer,
      dir,
      original,
      renamed
    )
  })

  it("emits watch events for nested directories", async () => {
    const dir = "/tmp-runtime-conformance/watch-depth"
    const nested = `${dir}/nested`
    dirs.add(dir)
    dirs.add(nested)
    const file = `${nested}/deep.txt`

    setTimeout(() => {
      files.set(file, new TextEncoder().encode("depth"))
    }, 10)
    setTimeout(() => {
      files.delete(file)
    }, 20)

    await ConformanceWatch.verifyWatchChurnLayer(
      QuickJSFileSystem.layer,
      nested,
      [
        { _tag: "Create", path: file },
        { _tag: "Remove", path: file }
      ]
    )
  })
})
