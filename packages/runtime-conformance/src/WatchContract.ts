import * as Effect from "effect/Effect";
import type * as Duration from "effect/Duration";
import * as FileSystem from "effect/FileSystem";
import type * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Stream from "effect/Stream";

export interface ExpectedWatchEvent {
  readonly _tag: FileSystem.WatchEvent["_tag"];
  readonly path: string;
}

export interface WatchSequenceOptions {
  readonly timeout?: Duration.Input;
}

const matchesExpected = (actual: FileSystem.WatchEvent, expected: ExpectedWatchEvent) =>
  actual._tag === expected._tag && actual.path === expected.path;

export const verifyWatchSequenceLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  path: string,
  expected: ReadonlyArray<ExpectedWatchEvent>,
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const events = yield* fs.watch(path).pipe(Stream.take(expected.length), Stream.runCollect);
      const actual = Array.from(events);
      if (actual.length !== expected.length) {
        throw new Error(
          `watch sequence contract failed: expected ${expected.length} events, got ${actual.length}`,
        );
      }
      for (let index = 0; index < expected.length; index++) {
        const left = actual[index]!;
        const right = expected[index]!;
        if (left._tag !== right._tag || left.path !== right.path) {
          throw new Error(
            `watch sequence contract failed at ${index}: ${JSON.stringify(left)} !== ${JSON.stringify(right)}`,
          );
        }
      }
    }).pipe(Effect.provide(layer)),
  );
};

export const verifyBasicWatchLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  path: string,
  expected: ExpectedWatchEvent,
) => verifyWatchSequenceLayer(layer, path, [expected]);

export const verifyWatchSubsequenceLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  path: string,
  expected: ReadonlyArray<ExpectedWatchEvent>,
  options: WatchSequenceOptions = {},
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const index = yield* Ref.make(0);
      const observed = yield* Ref.make<Array<FileSystem.WatchEvent>>([]);

      const drain = fs.watch(path).pipe(
        Stream.tap((event) => Ref.update(observed, (events) => [...events, event])),
        Stream.takeUntilEffect((event) =>
          Ref.modify(index, (current) => {
            if (current >= expected.length) {
              return [true, current];
            }
            const next = matchesExpected(event, expected[current]) ? current + 1 : current;
            return [next >= expected.length, next];
          }),
        ),
        Stream.runDrain,
      );

      const timed = yield* drain.pipe(Effect.timeoutOption(options.timeout ?? "2 seconds"));
      if (Option.isNone(timed)) {
        throw new Error(`watch subsequence timed out after ${options.timeout ?? "2 seconds"}`);
      }

      const finalIndex = yield* Ref.get(index);
      if (finalIndex < expected.length) {
        const events = yield* Ref.get(observed);
        throw new Error(
          `watch subsequence contract failed: expected ${expected.length} events, got ${finalIndex}. Observed: ${JSON.stringify(
            events,
          )}`,
        );
      }
    }).pipe(Effect.provide(layer)),
  );
};

export const verifyWatchChurnLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  path: string,
  expected: ReadonlyArray<ExpectedWatchEvent>,
  options: WatchSequenceOptions = {},
) => verifyWatchSubsequenceLayer(layer, path, expected, options);

export const verifyWatchRenameLayer = async (
  layer: Layer.Layer<FileSystem.FileSystem>,
  path: string,
  oldPath: string,
  newPath: string,
  options: WatchSequenceOptions = {},
) => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pending = new Set([`Remove:${oldPath}`, `Create:${newPath}`]);
      const observed = yield* Ref.make<Array<FileSystem.WatchEvent>>([]);

      const drain = fs.watch(path).pipe(
        Stream.tap((event) => Ref.update(observed, (events) => [...events, event])),
        Stream.takeUntilEffect((event) =>
          Effect.sync(() => {
            pending.delete(`${event._tag}:${event.path}`);
            return pending.size === 0;
          }),
        ),
        Stream.runDrain,
      );

      const timed = yield* drain.pipe(Effect.timeoutOption(options.timeout ?? "2 seconds"));
      if (Option.isNone(timed)) {
        const events = yield* Ref.get(observed);
        throw new Error(
          `watch rename timed out after ${options.timeout ?? "2 seconds"}: ${JSON.stringify(events)}`,
        );
      }
      if (pending.size > 0) {
        const events = yield* Ref.get(observed);
        throw new Error(
          `watch rename contract failed: missing ${Array.from(pending).join(", ")}. Observed: ${JSON.stringify(events)}`,
        );
      }
    }).pipe(Effect.provide(layer)),
  );
};
