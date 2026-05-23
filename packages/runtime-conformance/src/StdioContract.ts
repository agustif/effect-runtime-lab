import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as Stdio from "effect/Stdio";
import * as Stream from "effect/Stream";

export interface BasicStdioContractOptions {
  readonly expectedArgs: ReadonlyArray<string>;
  readonly stdoutChunk?: string | Uint8Array;
  readonly stderrChunk?: string | Uint8Array;
  readonly expectedStdinText?: ReadonlyArray<string>;
}

export const verifyBasicStdioLayer = async (
  layer: Layer.Layer<Stdio.Stdio>,
  options: BasicStdioContractOptions,
) => {
  const stdoutChunk = options.stdoutChunk ?? "stdout";
  const stderrChunk = options.stderrChunk ?? "stderr";

  await Effect.runPromise(
    Effect.gen(function* () {
      const stdio = yield* Stdio.Stdio;

      const args = yield* stdio.args;
      if (JSON.stringify(args) !== JSON.stringify(options.expectedArgs)) {
        throw new Error(`stdio args contract failed: ${JSON.stringify(args)}`);
      }

      yield* Stream.run(Stream.make(stdoutChunk), stdio.stdout());
      yield* Stream.run(Stream.make(stderrChunk), stdio.stderr());

      if (options.expectedStdinText) {
        const chunks = yield* stdio.stdin.pipe(
          Stream.take(options.expectedStdinText.length),
          Stream.runCollect,
        );
        const textChunks = Array.from(chunks, (chunk) => new TextDecoder().decode(chunk));
        if (JSON.stringify(textChunks) !== JSON.stringify(options.expectedStdinText)) {
          throw new Error(`stdio stdin contract failed: ${JSON.stringify(textChunks)}`);
        }
      }
    }).pipe(Effect.provide(layer)),
  );
};
