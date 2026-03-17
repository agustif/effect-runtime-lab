/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import { BadArgument } from "effect/PlatformError"
import * as NodePath from "node:path"

const tjsPath = (globalThis as typeof globalThis & { tjs?: { path?: typeof NodePath.posix } }).tjs?.path
const pathApi = tjsPath ?? NodePath.posix

const fromFileUrl: Path.Path["fromFileUrl"] = (url) =>
  Effect.try({
    try: () => decodeURIComponent(url.pathname),
    catch: (cause) =>
      new BadArgument({
        module: "TxikiPath",
        method: "fromFileUrl",
        cause
      })
  })

const toFileUrl: Path.Path["toFileUrl"] = (path) =>
  Effect.try({
    try: () => new URL(`file://${path.startsWith("/") ? "" : "/"}${path}`),
    catch: (cause) =>
      new BadArgument({
        module: "TxikiPath",
        method: "toFileUrl",
        cause
      })
  })

export const layer = Layer.succeed(Path.Path)({
  [Path.TypeId]: Path.TypeId,
  sep: pathApi.sep,
  basename: pathApi.basename,
  dirname: pathApi.dirname,
  extname: pathApi.extname,
  format: pathApi.format,
  fromFileUrl,
  isAbsolute: pathApi.isAbsolute,
  join: pathApi.join,
  normalize: pathApi.normalize,
  parse: pathApi.parse,
  relative: pathApi.relative,
  resolve: pathApi.resolve,
  toFileUrl,
  toNamespacedPath: pathApi.toNamespacedPath
})
