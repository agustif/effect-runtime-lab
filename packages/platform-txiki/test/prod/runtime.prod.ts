import * as Effect from "effect/Effect";

const main = Effect.gen(function* () {
  const tjs = (globalThis as typeof globalThis & { tjs?: { args?: ReadonlyArray<string> } }).tjs;
  if (!Array.isArray(tjs?.args)) {
    throw new Error("expected stdio args");
  }
  if (typeof globalThis !== "object" || typeof tjs !== "object") {
    throw new Error("expected txiki global");
  }
  const timer = yield* Effect.promise(
    () => new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 5)),
  );
  if (timer !== "ok") throw new Error("timer failed");
  const bytes = new TextEncoder().encode("hello");
  if (new TextDecoder().decode(bytes) !== "hello") {
    throw new Error("text encoding failed");
  }
});

Effect.runPromise(main).catch((error) => {
  console.error(error);
  throw error;
});
