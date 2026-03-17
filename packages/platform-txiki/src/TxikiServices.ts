/**
 * @since 1.0.0
 */
import type { FileSystem } from "effect/FileSystem"
import * as Layer from "effect/Layer"
import type { Path } from "effect/Path"
import type { Stdio } from "effect/Stdio"
import type { HttpClient } from "effect/unstable/http/HttpClient"
import * as TxikiFileSystem from "./TxikiFileSystem.ts"
import * as TxikiHttpClient from "./TxikiHttpClient.ts"
import * as TxikiPath from "./TxikiPath.ts"
import * as TxikiStdio from "./TxikiStdio.ts"

export type TxikiServices = FileSystem | Path | Stdio | HttpClient

export const layer: Layer.Layer<TxikiServices> = Layer.mergeAll(
  TxikiFileSystem.layer,
  TxikiPath.layer,
  TxikiStdio.layer,
  TxikiHttpClient.layer
)
