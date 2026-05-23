/**
 * @since 1.0.0
 */
import * as D1 from "@effect/sql-d1";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

const TypeId = "~@effect-experimental/cloudflare-d1/CloudflareD1";

/**
 * @since 1.0.0
 * @category models
 */
export interface CloudflareD1 {
  readonly [TypeId]: typeof TypeId;
  readonly binding: D1Database;
}

/**
 * @since 1.0.0
 * @category tags
 */
export const CloudflareD1: Context.Service<CloudflareD1, CloudflareD1> =
  Context.Service(TypeId);

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (binding: D1Database): CloudflareD1 =>
  CloudflareD1.of({
    [TypeId]: TypeId,
    binding,
  });

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (
  binding: D1Database,
  options?: Omit<D1.D1Client.D1ClientConfig, "db"> | undefined,
) =>
  Layer.mergeAll(
    Layer.succeed(CloudflareD1, make(binding)),
    D1.D1Client.layer({
      db: binding,
      ...options,
    }),
  );

/**
 * @since 1.0.0
 * @category layers
 */
