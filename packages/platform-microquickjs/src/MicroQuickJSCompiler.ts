/**
 * @since 1.0.0
 */
import {
  compile as compileSource,
  createCompileJS,
  type CompileJS,
  type CompileOptions,
} from "@ok.lol/mquickjs/compile";
import * as Effect from "effect/Effect";
import * as PlatformError from "effect/PlatformError";

const compilerError = (method: string, description: string, cause: unknown) =>
  PlatformError.badArgument({
    module: "MicroQuickJSCompiler",
    method,
    description,
    cause,
  });

export type { CompileJS, CompileOptions };

export const compile = (code: string, options?: CompileOptions): string =>
  compileSource(code, options);

export const createCompiler = (): CompileJS => createCompileJS();

export const compileEffect = (code: string, options?: CompileOptions) =>
  Effect.try({
    try: () => compileSource(code, options),
    catch: (cause) =>
      compilerError("compile", "failed to compile modern JavaScript for MicroQuickJS", cause),
  });
