/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";

const TypeId = "~@effect-experimental/cloudflare-kv/CloudflareKv";

/**
 * @since 1.0.0
 * @category models
 */
export interface CloudflareKv {
  readonly [TypeId]: typeof TypeId;
  readonly binding: KVNamespace;
  readonly keyValueStore: KeyValueStore.KeyValueStore;
}

/**
 * @since 1.0.0
 * @category tags
 */
export const CloudflareKv: Context.Service<CloudflareKv, CloudflareKv> =
  Context.Service(TypeId);

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (binding: KVNamespace): CloudflareKv => {
  const keyValueStore = KeyValueStore.make({
    clear: Effect.fail(
      new KeyValueStore.KeyValueStoreError({
        message: "KV does not support clear()",
        method: "clear",
      }),
    ),
    get: (key) =>
      Effect.tryPromise({
        try: async () => {
          const value = await binding.get(key);
          return value === null ? undefined : value;
        },
        catch: (cause) =>
          new KeyValueStore.KeyValueStoreError({
            message: "KV get failed",
            method: "get",
            key,
            cause,
          }),
      }),
    getUint8Array: (key) =>
      Effect.tryPromise({
        try: async () => {
          const value = await binding.get(key, "arrayBuffer");
          return value === null ? undefined : new Uint8Array(value);
        },
        catch: (cause) =>
          new KeyValueStore.KeyValueStoreError({
            message: "KV getUint8Array failed",
            method: "getUint8Array",
            key,
            cause,
          }),
      }),
    remove: (key) =>
      Effect.tryPromise({
        try: () => binding.delete(key),
        catch: (cause) =>
          new KeyValueStore.KeyValueStoreError({
            message: "KV delete failed",
            method: "remove",
            key,
            cause,
          }),
      }),
    set: (key, value) =>
      Effect.tryPromise({
        try: () => binding.put(key, typeof value === "string" ? value : value),
        catch: (cause) =>
          new KeyValueStore.KeyValueStoreError({
            message: "KV put failed",
            method: "set",
            key,
            cause,
          }),
      }),
    size: Effect.fail(
      new KeyValueStore.KeyValueStoreError({
        message: "KV does not support size()",
        method: "size",
      }),
    ),
  });

  return CloudflareKv.of({
    [TypeId]: TypeId,
    binding,
    keyValueStore,
  });
};

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (
  binding: KVNamespace,
): Layer.Layer<CloudflareKv | KeyValueStore.KeyValueStore> =>
  Layer.effectContext(
    Effect.sync(() => {
      const service = make(binding);
      return Context.make(CloudflareKv, service).pipe(
        Context.add(KeyValueStore.KeyValueStore, service.keyValueStore),
      );
    }),
  );
