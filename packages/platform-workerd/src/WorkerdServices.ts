/**
 * @since 1.0.0
 */
import type * as HttpClient from "effect/unstable/http/HttpClient";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as WorkerdContext from "./WorkerdContext.ts";

/**
 * @since 1.0.0
 * @category models
 */
export type WorkerdServices = HttpClient.HttpClient | WorkerdContext.WorkerdContext;

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = <
  Env = unknown,
  Props = unknown,
  Ctx extends WorkerdContext.InvocationContext<Props> = WorkerdContext.InvocationContext<Props>,
  Exports = unknown,
  Event = unknown,
>(
  options: WorkerdContext.InvocationOptions<Env, Props, Ctx, Exports, Event>,
) => Layer.mergeAll(FetchHttpClient.layer, WorkerdContext.layer(options));
