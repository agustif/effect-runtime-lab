/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";
import * as Stream from "effect/Stream";
import * as HttpBody from "effect/unstable/http/HttpBody";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientError from "effect/unstable/http/HttpClientError";
import * as Cookies from "effect/unstable/http/Cookies";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

export const TxikiOptions = ServiceMap.Reference<{
  readonly timeoutMs?: number;
}>("@effect-experimental/platform-txiki/TxikiHttpClient/TxikiOptions", {
  defaultValue: () => ({}),
});

export const withOptions: {
  (options: {
    readonly timeoutMs?: number;
  }): <E, R>(self: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>;
  <E, R>(
    self: HttpClient.HttpClient.With<E, R>,
    options: { readonly timeoutMs?: number },
  ): HttpClient.HttpClient.With<E, R>;
} = dual(2, (self, options) =>
  HttpClient.transformResponse(
    self,
    Effect.updateService(TxikiOptions, (current) => ({ ...current, ...options })),
  ),
);

const transportError = (
  request: Parameters<HttpClient.HttpClient["execute"]>[0],
  description: string,
  cause?: unknown,
) =>
  new HttpClientError.HttpClientError({
    reason: new HttpClientError.TransportError({
      request,
      description,
      ...(cause === undefined ? {} : { cause }),
    }),
  });

const splitSetCookieHeader = (header: string): Array<string> => {
  const out: Array<string> = [];
  let start = 0;
  let inExpires = false;
  let inQuotes = false;
  const lower = header.toLowerCase();

  for (let index = 0; index < header.length; index++) {
    const char = header[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && lower.slice(index, index + 8) === "expires=") {
      inExpires = true;
      continue;
    }
    if (!inQuotes && inExpires && char === ";") {
      inExpires = false;
      continue;
    }
    if (!inQuotes && !inExpires && char === ",") {
      out.push(header.slice(start, index).trim());
      start = index + 1;
    }
  }

  const tail = header.slice(start).trim();
  if (tail.length > 0) {
    out.push(tail);
  }
  if (out.length > 1) {
    return out;
  }

  const attributeKeys = new Set([
    "expires",
    "max-age",
    "domain",
    "path",
    "secure",
    "httponly",
    "samesite",
    "priority",
    "partitioned",
  ]);

  const segments = header.split(";");
  const rebuilt: Array<string> = [];
  let current = "";

  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (segment.length === 0) {
      continue;
    }

    const eq = segment.indexOf("=");
    const key = eq === -1 ? segment.toLowerCase() : segment.slice(0, eq).toLowerCase();
    const startsNewCookie = eq !== -1 && !attributeKeys.has(key);

    if (startsNewCookie) {
      if (current.length > 0) {
        rebuilt.push(current);
      }
      current = segment;
    } else if (current.length > 0) {
      current = `${current}; ${segment}`;
    } else {
      current = segment;
    }
  }

  if (current.length > 0) {
    rebuilt.push(current);
  }

  return rebuilt;
};

const getSetCookieHeaders = (headers: globalThis.Headers): Array<string> => {
  const candidate = headers as globalThis.Headers & { getSetCookie?: () => Array<string> };
  if (typeof candidate.getSetCookie === "function") {
    return candidate.getSetCookie();
  }

  const header = headers.get("set-cookie");
  return header ? splitSetCookieHeader(header) : [];
};

const toFetchHeaders = (headers: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "content-length") {
      continue;
    }
    out[key] = value;
  }
  return out;
};

const fromTxikiWeb = (
  request: Parameters<HttpClient.HttpClient["execute"]>[0],
  source: Response,
): HttpClientResponse.HttpClientResponse => {
  const response = HttpClientResponse.fromWeb(
    request,
    source,
  ) as HttpClientResponse.HttpClientResponse & {
    cachedCookies?: Cookies.Cookies;
  };
  Object.defineProperty(response, "cookies", {
    configurable: true,
    enumerable: true,
    get() {
      if (response.cachedCookies) {
        return response.cachedCookies;
      }
      return (response.cachedCookies = Cookies.fromSetCookie(getSetCookieHeaders(source.headers)));
    },
  });
  return response;
};

const toArrayBuffer = (view: Uint8Array): ArrayBuffer => {
  const bytes = new Uint8Array(view.byteLength);
  bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  return bytes.buffer;
};

const encoder = new TextEncoder();

const mergeUint8Arrays = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
};

const encodeMultipartFormData = async (
  formData: FormData,
): Promise<{ readonly body: ArrayBuffer; readonly contentType: string }> => {
  const boundary = `----effect-runtime-lab-${Math.random().toString(16).slice(2)}`;
  const chunks: Array<Uint8Array> = [];
  const entries = (
    formData as FormData & {
      entries(): IterableIterator<[string, FormDataEntryValue]>;
    }
  ).entries();

  for (const [name, value] of entries) {
    if (typeof value === "string") {
      chunks.push(
        encoder.encode(
          `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
            `${value}\r\n`,
        ),
      );
      continue;
    }

    const filename = "name" in value && typeof value.name === "string" ? value.name : "blob";
    const contentType = value.type || "application/octet-stream";
    chunks.push(
      encoder.encode(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
          `Content-Type: ${contentType}\r\n\r\n`,
      ),
    );
    chunks.push(new Uint8Array(await value.arrayBuffer()));
    chunks.push(encoder.encode("\r\n"));
  }

  chunks.push(encoder.encode(`--${boundary}--\r\n`));
  return {
    body: toArrayBuffer(mergeUint8Arrays(chunks)),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
};

const encodeBody = (
  request: Parameters<HttpClient.HttpClient["execute"]>[0],
  body: HttpBody.HttpBody,
): Effect.Effect<
  { readonly body: BodyInit | null; readonly contentType?: string },
  HttpClientError.HttpClientError
> => {
  switch (body._tag) {
    case "Empty":
      return Effect.succeed({ body: null });
    case "Uint8Array":
      return Effect.succeed({ body: toArrayBuffer(body.body) });
    case "Raw": {
      if (typeof body.body === "string") {
        return Effect.succeed({ body: body.body });
      }
      if (body.body instanceof ArrayBuffer) {
        return Effect.succeed({ body: body.body });
      }
      if (ArrayBuffer.isView(body.body)) {
        return Effect.succeed({
          body: toArrayBuffer(
            new Uint8Array(body.body.buffer, body.body.byteOffset, body.body.byteLength),
          ),
        });
      }
      return Effect.fail(transportError(request, "unsupported raw request body"));
    }
    case "FormData": {
      return Effect.tryPromise({
        try: () => encodeMultipartFormData(body.formData),
        catch: (cause) => transportError(request, "form-data request body encoding failed", cause),
      });
    }
    case "Stream":
      return Stream.runCollect(body.stream).pipe(
        Effect.map((chunks) => {
          const buffers = Array.from(chunks);
          return {
            body: toArrayBuffer(mergeUint8Arrays(buffers)),
          } as const;
        }),
        Effect.mapError((cause) =>
          transportError(request, "stream request body encoding failed", cause),
        ),
      );
  }
};

const makeClient = HttpClient.make((request, url, signal, fiber) =>
  Effect.gen(function* () {
    if (typeof fetch !== "function") {
      return yield* Effect.fail(transportError(request, "global fetch is not available"));
    }

    const encodedBody = yield* encodeBody(request, request.body);

    const timeoutMs = fiber.getRef(TxikiOptions).timeoutMs;
    const useTimeout = typeof timeoutMs === "number" && timeoutMs > 0;

    const controller = useTimeout ? new AbortController() : undefined;
    if (controller) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
      }
    }

    const timeout = controller
      ? setTimeout(() => controller.abort(new Error("timeout")), timeoutMs)
      : undefined;

    const response = yield* Effect.tryPromise({
      try: async () =>
        fetch(url, {
          method: request.method,
          headers: {
            ...toFetchHeaders(request.headers as Record<string, string>),
            ...(encodedBody.contentType === undefined
              ? {}
              : { "content-type": encodedBody.contentType }),
          },
          body: encodedBody.body,
          signal: controller ? controller.signal : signal,
        }),
      catch: (cause) => transportError(request, "txiki fetch failed", cause),
    });

    if (timeout !== undefined) {
      clearTimeout(timeout);
    }

    return fromTxikiWeb(request, response);
  }),
);

export const layer = Layer.effect(HttpClient.HttpClient)(Effect.succeed(makeClient));
