import * as Effect from "effect/Effect"
import * as Path from "effect/Path"
import * as TxikiPath from "../../src/TxikiPath.ts"

const main = Effect.gen(function* () {
  const path = yield* Path.Path
  if (path.join("home", "user") !== "home/user") throw new Error("join failed")
  if (path.dirname("/path/to/file.txt") !== "/path/to") throw new Error("dirname failed")
  if (path.resolve("/home", "user") !== "/home/user") throw new Error("resolve failed")
}).pipe(Effect.provide(TxikiPath.layer))

Effect.runPromise(main).catch((error) => {
  console.error(error)
  throw error
})
