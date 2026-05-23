/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";

const TypeId = "~@effect-experimental/platform-workerd/unstable/WorkerdTmpPath";

/**
 * @since 1.0.0
 * @category errors
 */
export class WorkerdTmpPathError extends Data.TaggedError("WorkerdTmpPathError")<{
  readonly cause: unknown;
}> {}

/**
 * @since 1.0.0
 * @category models
 */
export interface WorkerdTmpPath {
  readonly [TypeId]: typeof TypeId;
  readonly join: (...parts: ReadonlyArray<string>) => string;
  readonly resolve: (...parts: ReadonlyArray<string>) => string;
  readonly normalize: (path: string) => string;
}

/**
 * @since 1.0.0
 * @category tags
 */
export const WorkerdTmpPath: Context.Service<WorkerdTmpPath, WorkerdTmpPath> =
  Context.Service(TypeId);

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (): WorkerdTmpPath => {
  const join = (...parts: ReadonlyArray<string>) => parts.join("/").replace(/\/+/g, "/");
  const normalize = (path: string) => path.replace(/\/+/g, "/");

  return WorkerdTmpPath.of({
    [TypeId]: TypeId,
    join,
    normalize,
    resolve: (...parts) => normalize(join(...parts)),
  });
};
