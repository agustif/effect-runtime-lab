import * as Effect from "effect/Effect";
import * as Console from "effect/Console";
import * as Stdio from "effect/Stdio";
import * as Stream from "effect/Stream";
import * as QuickJSConsole from "../../src/QuickJSConsole.ts";
import * as QuickJSStdio from "../../src/QuickJSStdio.ts";

const main = Effect.gen(function* () {
  yield* Console.log("running runtime prod checks");
  const args = yield* Stdio.Stdio.pipe(
    Effect.flatMap((stdio) => stdio.args),
    Effect.provide(QuickJSStdio.layer),
  );
  if (!Array.isArray(args)) {
    throw new Error("expected stdio args");
  }
  if (typeof process !== "object" || typeof process.cwd !== "function") {
    throw new Error("expected process polyfill");
  }
  const timer = yield* Effect.promise(
    () => new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 5)),
  );
  if (timer !== "ok") throw new Error("timer failed");
  const bytes = new TextEncoder().encode("hello");
  if (new TextDecoder().decode(bytes) !== "hello") {
    throw new Error("text encoding failed");
  }
  yield* Stream.run(
    Stream.make("stdout smoke"),
    Stdio.Stdio.pipe(
      Effect.map((stdio) => stdio.stdout()),
      Effect.provide(QuickJSStdio.layer),
    ),
  );
}).pipe(Effect.provide(QuickJSConsole.layer));

Effect.runPromise(main).catch((error) => {
  console.error(error);
  throw error;
});
