import * as Effect from "effect/Effect";

export interface UnstableTmpFsHarness {
  readonly exists: (path: string) => Effect.Effect<boolean, unknown>;
  readonly makeDirectory: (path: string) => Effect.Effect<void, unknown>;
  readonly writeFile: (path: string, data: string) => Effect.Effect<void, unknown>;
  readonly readText: (path: string) => Effect.Effect<string, unknown>;
  readonly remove: (path: string) => Effect.Effect<void, unknown>;
}

export const verifyBasicTmpFs = async (
  harness: UnstableTmpFsHarness,
  directory: string,
  fileName = "sample.txt",
) => {
  const file = `${directory}/${fileName}`;

  await Effect.runPromise(harness.makeDirectory(directory));
  await Effect.runPromise(harness.writeFile(file, "ok"));
  const text = await Effect.runPromise(harness.readText(file));
  if (text !== "ok") {
    throw new Error("unstable tmp fs write/read contract failed");
  }
  const before = await Effect.runPromise(harness.exists(file));
  if (!before) {
    throw new Error("unstable tmp fs exists contract failed");
  }
  await Effect.runPromise(harness.remove(file));
  const after = await Effect.runPromise(harness.exists(file));
  if (after) {
    throw new Error("unstable tmp fs remove contract failed");
  }
};
