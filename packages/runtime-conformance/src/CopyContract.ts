import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import type * as Layer from "effect/Layer"

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

export interface CopyContractOptions {
  readonly directory: string
  readonly sourceFileName: string
  readonly copiedFileName: string
  readonly nestedDirectoryName: string
  readonly nestedFileName: string
  readonly copiedDirectoryName: string
}

export const verifyBasicCopyLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  options: CopyContractOptions
) => {
  const sourceFile = `${options.directory}/${options.sourceFileName}`
  const copiedFile = `${options.directory}/${options.copiedFileName}`
  const nestedDirectory = `${options.directory}/${options.nestedDirectoryName}`
  const nestedFile = `${nestedDirectory}/${options.nestedFileName}`
  const copiedDirectory = `${options.directory}/${options.copiedDirectoryName}`

  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      yield* fs.makeDirectory(nestedDirectory, { recursive: true })
      yield* fs.writeFile(sourceFile, new TextEncoder().encode("source"))
      yield* fs.writeFile(nestedFile, new TextEncoder().encode("nested"))

      yield* fs.copyFile(sourceFile, copiedFile)
      const copiedFileBytes = yield* fs.readFile(copiedFile)
      if (decode(copiedFileBytes) !== "source") {
        throw new Error(`copyFile contract failed: ${decode(copiedFileBytes)}`)
      }

      yield* fs.copy(nestedDirectory, copiedDirectory)
      const copiedNestedBytes = yield* fs.readFile(`${copiedDirectory}/${options.nestedFileName}`)
      if (decode(copiedNestedBytes) !== "nested") {
        throw new Error(`copy contract failed: ${decode(copiedNestedBytes)}`)
      }

      yield* fs.remove(options.directory, { recursive: true, force: true })
    }).pipe(Effect.provide(layer))
  )
}
