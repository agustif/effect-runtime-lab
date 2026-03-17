import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import * as ConformanceWatch from "@effect-experimental/runtime-conformance/WatchContract"
import * as QuickJSFileSystem from "../../src/QuickJSFileSystem.ts"

const sleep = (ms) => Effect.promise(() => new Promise((resolve) => setTimeout(resolve, ms)))

const main = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const dir = "./tmp-qjs-watch"
  const file = `${dir}/watched.txt`

  yield* fs.makeDirectory(dir, { recursive: true })

  const fiber = yield* fs.watch(dir).pipe(
    Stream.take(4),
    Stream.runCollect,
    Effect.forkChild
  )

  yield* sleep(30)
  yield* fs.writeFile(file, new TextEncoder().encode("one"))
  yield* sleep(30)
  yield* fs.writeFile(file, new TextEncoder().encode("two"))
  yield* sleep(30)
  yield* fs.writeFile(file, new TextEncoder().encode("three"))
  yield* sleep(30)
  yield* fs.remove(file, { force: true })

  const events = Array.from(yield* Fiber.join(fiber))
  const expected = [
    { _tag: "Create", path: file },
    { _tag: "Update", path: file },
    { _tag: "Update", path: file },
    { _tag: "Remove", path: file }
  ]
  if (JSON.stringify(events) !== JSON.stringify(expected)) {
    throw new Error(`watch prod failed: ${JSON.stringify(events)}`)
  }

  const renamed = `${dir}/renamed.txt`
  const renameFiber = yield* Effect.forkChild(
    Effect.gen(function* () {
      yield* sleep(30)
      yield* fs.writeFile(file, new TextEncoder().encode("rename"))
      yield* sleep(30)
      yield* fs.rename(file, renamed)
    })
  )

  yield* Effect.promise(() =>
    ConformanceWatch.verifyWatchRenameLayer(QuickJSFileSystem.layer, dir, file, renamed)
  )
  yield* Fiber.join(renameFiber)

  const nestedDir = `${dir}/nested`
  const nestedFile = `${nestedDir}/deep.txt`
  yield* fs.makeDirectory(nestedDir, { recursive: true })
  const nestedFiber = yield* Effect.forkChild(
    Effect.gen(function* () {
      yield* sleep(30)
      yield* fs.writeFile(nestedFile, new TextEncoder().encode("deep"))
      yield* sleep(30)
      yield* fs.remove(nestedFile, { force: true })
    })
  )

  yield* Effect.promise(() =>
    ConformanceWatch.verifyWatchChurnLayer(QuickJSFileSystem.layer, nestedDir, [
      { _tag: "Create", path: nestedFile },
      { _tag: "Remove", path: nestedFile }
    ])
  )
  yield* Fiber.join(nestedFiber)

  yield* fs.remove(dir, { recursive: true, force: true })
}).pipe(Effect.provide(QuickJSFileSystem.layer))

Effect.runPromise(main).catch((error) => {
  console.error(error)
  throw error
})
