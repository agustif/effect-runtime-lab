import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FileSystem from "effect/FileSystem"
import * as Stream from "effect/Stream"
import * as TxikiFileSystem from "../../src/TxikiFileSystem.ts"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const main = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const dir = "./tmp-txiki-fs"
  const file = `${dir}/hello.txt`
  yield* fs.makeDirectory(dir, { recursive: true })
  yield* fs.writeFile(file, encoder.encode("hello fs"))
  const read = yield* fs.readFile(file)
  if (decoder.decode(read) !== "hello fs") throw new Error("read/write failed")
  const entries = yield* fs.readDirectory(dir)
  if (!entries.includes("hello.txt")) throw new Error("readDirectory failed")
  yield* fs.rename(file, `${dir}/renamed.txt`)
  const info = yield* fs.stat(`${dir}/renamed.txt`)
  if (info.type !== "File") throw new Error("stat failed")

  const tempDir = yield* fs.makeTempDirectory({ prefix: "prod-txiki-" })
  const tempFile = yield* fs.makeTempFile({ prefix: "prod-txiki-", suffix: ".txt" })
  const tempDirInfo = yield* fs.stat(tempDir)
  const tempFileInfo = yield* fs.stat(tempFile)
  if (tempDirInfo.type !== "Directory") throw new Error("makeTempDirectory failed")
  if (tempFileInfo.type !== "File") throw new Error("makeTempFile failed")

  yield* Effect.scoped(
    Effect.gen(function* () {
      const handle = yield* fs.open(`${dir}/renamed.txt`, { flag: "a+" })
      yield* handle.write(encoder.encode(" world"))
      yield* handle.sync
      yield* handle.seek(0, "start")
      const firstRead = yield* handle.readAlloc(5).pipe(Effect.flatMap((_) => _.asEffect()))
      if (decoder.decode(firstRead) !== "hello") {
        throw new Error("append read cursor failed")
      }
      const bytes = yield* fs.readFile(`${dir}/renamed.txt`)
      if (decoder.decode(bytes) !== "hello fs world") {
        throw new Error("append write failed")
      }
      yield* handle.truncate(5)
      yield* handle.write(encoder.encode("!"))
      const truncated = yield* fs.readFile(`${dir}/renamed.txt`)
      if (decoder.decode(truncated) !== "hello!") {
        throw new Error("truncate cursor clamp failed")
      }
    })
  )

  const sinkFile = `${dir}/sink.txt`
  const linkFile = `${dir}/sink-link.txt`
  yield* Stream.make(
    encoder.encode("sink "),
    encoder.encode("stream")
  ).pipe(Stream.run(fs.sink(sinkFile)))
  const streamed = yield* fs.stream(sinkFile, {
    offset: FileSystem.Size(5),
    bytesToRead: FileSystem.Size(6),
    chunkSize: FileSystem.Size(3)
  }).pipe(
    Stream.map((chunk) => decoder.decode(chunk)),
    Stream.runCollect,
    Effect.map((chunks) => Array.from(chunks).join(""))
  )
  if (streamed !== "stream") {
    throw new Error("file stream failed")
  }

  yield* fs.link(sinkFile, linkFile)
  const linked = yield* fs.readFile(linkFile)
  if (decoder.decode(linked) !== "sink stream") {
    throw new Error("hard link failed")
  }

  yield* fs.chmod(sinkFile, 0o600)
  const chmodInfo = yield* fs.stat(sinkFile)
  if ((chmodInfo.mode & 0o777) !== 0o600) {
    throw new Error("chmod failed")
  }

  let releasedHandle: FileSystem.File | undefined
  yield* Effect.scoped(
    Effect.gen(function* () {
      releasedHandle = yield* fs.open(sinkFile, { flag: "r" })
    })
  )
  if (!releasedHandle) {
    throw new Error("released handle missing")
  }
  const closedExit = yield* releasedHandle.readAlloc(1).pipe(Effect.exit)
  if (!Exit.isFailure(closedExit)) {
    throw new Error("closed handle read unexpectedly succeeded")
  }

  const permissionFile = `${dir}/permission.txt`
  yield* fs.writeFile(permissionFile, encoder.encode("secret"))
  yield* fs.chmod(permissionFile, 0o000)
  const permissionResult = yield* Effect.scoped(fs.open(permissionFile, { flag: "r" })).pipe(
    Effect.match({
      onSuccess: () => "opened",
      onFailure: (error) => error.reason._tag
    })
  )
  yield* fs.chmod(permissionFile, 0o600)
  if (permissionResult !== "PermissionDenied") {
    throw new Error(`permission mapping failed: ${permissionResult}`)
  }

  const nested = `${dir}/recursive/nested`
  const owned = `${nested}/owned.txt`
  yield* fs.makeDirectory(nested, { recursive: true })
  yield* fs.writeFile(owned, encoder.encode("owned"))
  yield* fs.remove(`${dir}/recursive`, { recursive: true, force: true })
  if (yield* fs.exists(owned)) {
    throw new Error("recursive cleanup failed")
  }

  yield* fs.remove(`${dir}/renamed.txt`, { force: true })
  yield* fs.remove(linkFile, { force: true })
  yield* fs.remove(sinkFile, { force: true })
  yield* fs.remove(permissionFile, { force: true })
  yield* fs.remove(dir, { recursive: true, force: true })
  yield* fs.remove(tempFile, { force: true })
  yield* fs.remove(tempDir, { recursive: true, force: true })
}).pipe(Effect.provide(TxikiFileSystem.layer))

Effect.runPromise(main).catch((error) => {
  console.error(error)
  throw error
})
