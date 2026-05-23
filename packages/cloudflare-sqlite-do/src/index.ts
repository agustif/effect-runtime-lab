/**
 * @since 1.0.0
 */
import * as SqliteDo from "@effect/sql-sqlite-do";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";

const TypeId = "~@effect-experimental/cloudflare-sqlite-do/CloudflareSqliteDo";

/**
 * @since 1.0.0
 * @category models
 */
export interface CloudflareSqliteDo {
  readonly [TypeId]: typeof TypeId;
  readonly storage: SqlStorage;
}

/**
 * @since 1.0.0
 * @category tags
 */
export const CloudflareSqliteDo: ServiceMap.Service<CloudflareSqliteDo, CloudflareSqliteDo> =
  ServiceMap.Service(TypeId);

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (storage: SqlStorage): CloudflareSqliteDo =>
  CloudflareSqliteDo.of({
    [TypeId]: TypeId,
    storage,
  });

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (
  storage: SqlStorage,
  options?: Omit<SqliteDo.SqliteClient.SqliteClientConfig, "db"> | undefined,
) =>
  Layer.mergeAll(
    Layer.succeed(CloudflareSqliteDo, make(storage)),
    SqliteDo.SqliteClient.layer({
      db: storage,
      ...options,
    }),
  );

/**
 * @since 1.0.0
 * @category layers
 */
