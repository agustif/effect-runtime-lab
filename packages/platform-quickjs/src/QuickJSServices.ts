/**
 * @since 1.0.0
 */
import type { FileSystem } from "effect/FileSystem";
import * as Layer from "effect/Layer";
import type { Path } from "effect/Path";
import type { Stdio } from "effect/Stdio";
import type { HttpClient } from "effect/unstable/http/HttpClient";
import * as QuickJSFileSystem from "./QuickJSFileSystem.ts";
import * as QuickJSHttpClient from "./QuickJSHttpClient.ts";
import * as QuickJSPath from "./QuickJSPath.ts";
import * as QuickJSStdio from "./QuickJSStdio.ts";

/**
 * @since 1.0.0
 * @category models
 */
export type QuickJSServices = FileSystem | Path | Stdio | HttpClient;

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<QuickJSServices> = Layer.mergeAll(
  QuickJSFileSystem.layer,
  QuickJSPath.layer,
  QuickJSStdio.layer,
  QuickJSHttpClient.layer,
);
