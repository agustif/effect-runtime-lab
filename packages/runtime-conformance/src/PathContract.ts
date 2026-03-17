import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Path from "effect/Path"

export const verifyBasicPathLayer = async (layer: Layer.Layer<Path.Path>) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const path = yield* Path.Path
      if (path.sep !== "/") throw new Error(`expected '/', got '${path.sep}'`)
      if (path.basename("/path/to/file.txt") !== "file.txt") throw new Error("basename contract failed")
      if (path.dirname("/path/to/file.txt") !== "/path/to") throw new Error("dirname contract failed")
      if (path.extname("/path/to/file.txt") !== ".txt") throw new Error("extname contract failed")
      if (path.join("home", "user", "docs") !== "home/user/docs") throw new Error("join contract failed")
      if (path.normalize("/path/./to//file") !== "/path/to/file") throw new Error("normalize contract failed")
      if (path.resolve("/home", "user") !== "/home/user") throw new Error("resolve contract failed")
    }).pipe(Effect.provide(layer))
  )
}
