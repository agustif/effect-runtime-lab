/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as Headers from "effect/unstable/http/Headers";
import * as Cookies from "effect/unstable/http/Cookies";
import * as HttpBody from "effect/unstable/http/HttpBody";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientError from "effect/unstable/http/HttpClientError";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";
import * as HttpIncomingMessage from "effect/unstable/http/HttpIncomingMessage";
import * as Inspectable from "effect/Inspectable";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { pipeArguments, type Pipeable } from "effect/Pipeable";
import * as Schema from "effect/Schema";
import * as ServiceMap from "effect/ServiceMap";
import * as Stream from "effect/Stream";
import * as UrlParams from "effect/unstable/http/UrlParams";

declare const globalThis: {
  readonly http?: {
    readonly globalInit?: () => void;
    readonly globalCleanup?: () => void;
    readonly request: (
      method: string,
      url: string,
      body: string | Uint8Array | ArrayBuffer | null | FormData,
      headers: string,
      timeout: number,
      options?: {
        readonly insecure?: boolean;
        readonly follow?: boolean;
        readonly ca?: string;
        readonly signal?: AbortSignal;
        readonly stream?: boolean;
      },
    ) => Promise<{
      readonly statusCode: number;
      readonly headers: Record<string, string | ReadonlyArray<string>>;
      readonly body?: string;
      readonly bodyBytes?: ArrayBuffer;
      readonly readChunk?: () => ArrayBuffer | undefined | null;
    }>;
  };
};

/**
 * @since 1.0.0
 * @category QuickJS
 */
export const QuickJSOptions = ServiceMap.Reference<{
  readonly insecure?: boolean;
  readonly follow?: boolean;
  readonly ca?: string;
  readonly timeoutSeconds?: number;
}>("@effect-experimental/platform-quickjs/QuickJSHttpClient/QuickJSOptions", {
  defaultValue: () => ({}),
});

/**
 * @since 1.0.0
 * @category QuickJS
 */
export const withOptions: {
  (options: {
    readonly insecure?: boolean;
    readonly follow?: boolean;
    readonly ca?: string;
    readonly timeoutSeconds?: number;
  }): <E, R>(self: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>;
  <E, R>(
    self: HttpClient.HttpClient.With<E, R>,
    options: {
      readonly insecure?: boolean;
      readonly follow?: boolean;
      readonly ca?: string;
      readonly timeoutSeconds?: number;
    },
  ): HttpClient.HttpClient.With<E, R>;
} = dual(2, (self, options) =>
  HttpClient.transformResponse(
    self,
    Effect.updateService(QuickJSOptions, (current) => ({ ...current, ...options })),
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

const decodeError = (
  request: Parameters<HttpClient.HttpClient["execute"]>[0],
  response: HttpClientResponse.HttpClientResponse,
  description: string,
  cause?: unknown,
) =>
  new HttpClientError.HttpClientError({
    reason: new HttpClientError.DecodeError({
      request,
      response,
      description,
      ...(cause === undefined ? {} : { cause }),
    }),
  });

const emptyBodyError = (
  request: Parameters<HttpClient.HttpClient["execute"]>[0],
  response: HttpClientResponse.HttpClientResponse,
  description: string,
) =>
  new HttpClientError.HttpClientError({
    reason: new HttpClientError.EmptyBodyError({
      request,
      response,
      description,
    }),
  });

interface NativeResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string | ReadonlyArray<string>>;
  readonly body?: string;
  readonly bodyBytes?: ArrayBuffer;
  readonly readChunk?: () => ArrayBuffer | undefined | null;
}

class QuickJSResponse
  extends Inspectable.Class
  implements HttpClientResponse.HttpClientResponse, Pipeable
{
  readonly [HttpIncomingMessage.TypeId] = HttpIncomingMessage.TypeId;
  readonly [HttpClientResponse.TypeId] = HttpClientResponse.TypeId;

  readonly request: Parameters<HttpClient.HttpClient["execute"]>[0];
  readonly source: NativeResponse;
  private readonly initialBody: Uint8Array;
  private readonly readChunk: (() => ArrayBuffer | undefined | null) | undefined;
  private _headers?: Headers.Headers;
  private _cookies?: Cookies.Cookies;
  private textBody?: Effect.Effect<string, HttpClientError.HttpClientError>;
  private arrayBufferBody?: Effect.Effect<ArrayBuffer, HttpClientError.HttpClientError>;
  private formDataBody?: Effect.Effect<FormData, HttpClientError.HttpClientError>;
  private bodyBytesPromise?: Promise<Uint8Array>;

  constructor(request: Parameters<HttpClient.HttpClient["execute"]>[0], source: NativeResponse) {
    super();
    this.request = request;
    this.source = source;
    this.initialBody = source.bodyBytes
      ? new Uint8Array(source.bodyBytes)
      : source.body
        ? new TextEncoder().encode(source.body)
        : new Uint8Array(0);
    this.readChunk =
      typeof source.readChunk === "function" ? source.readChunk.bind(source) : undefined;
  }

  pipe() {
    return pipeArguments(this, arguments);
  }

  toJSON(): unknown {
    return HttpIncomingMessage.inspect(this, {
      _id: "HttpClientResponse",
      request: this.request.toJSON(),
      status: this.status,
    });
  }

  get status(): number {
    return this.source.statusCode;
  }

  get headers(): Headers.Headers {
    if (this._headers) return this._headers;
    return (this._headers = Headers.fromInput(this.source.headers));
  }

  get cookies(): Cookies.Cookies {
    if (this._cookies) return this._cookies;
    const setCookie = this.source.headers["set-cookie"];
    return (this._cookies = setCookie
      ? Cookies.fromSetCookie(Array.isArray(setCookie) ? setCookie : [setCookie])
      : Cookies.empty);
  }

  get remoteAddress(): Option.Option<string> {
    return Option.none();
  }

  get json(): Effect.Effect<Schema.Json, HttpClientError.HttpClientError> {
    return Effect.flatMap(this.text, (text) =>
      Effect.try({
        try: () => (text === "" ? null : JSON.parse(text)) as Schema.Json,
        catch: (cause) => decodeError(this.request, this, "response body is not valid JSON", cause),
      }),
    );
  }

  get text(): Effect.Effect<string, HttpClientError.HttpClientError> {
    return (this.textBody ??= Effect.tryPromise({
      try: async () => {
        const bytes = await this.collectBodyBytes();
        return new TextDecoder().decode(bytes);
      },
      catch: (cause) =>
        decodeError(this.request, this, "response body text decoding failed", cause),
    }).pipe(Effect.cached, Effect.runSync));
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, HttpClientError.HttpClientError> {
    return Effect.flatMap(this.text, (text) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(text)),
        catch: (cause) =>
          decodeError(this.request, this, "response body is not valid URLSearchParams", cause),
      }),
    );
  }

  get formData(): Effect.Effect<FormData, HttpClientError.HttpClientError> {
    return (this.formDataBody ??= Effect.fail(
      decodeError(this.request, this, "FormData decoding is not supported in QuickJSHttpClient"),
    ).pipe(Effect.cached, Effect.runSync));
  }

  get arrayBuffer(): Effect.Effect<ArrayBuffer, HttpClientError.HttpClientError> {
    return (this.arrayBufferBody ??= Effect.tryPromise({
      try: async () => {
        const bytes = await this.collectBodyBytes();
        const copied = new Uint8Array(bytes.byteLength);
        copied.set(bytes);
        return copied.buffer;
      },
      catch: (cause) =>
        decodeError(this.request, this, "response body arrayBuffer decoding failed", cause),
    }).pipe(Effect.cached, Effect.runSync));
  }

  get stream(): Stream.Stream<Uint8Array, HttpClientError.HttpClientError> {
    if (this.readChunk === undefined) {
      return this.initialBody.byteLength === 0
        ? Stream.fail(emptyBodyError(this.request, this, "cannot create stream from empty body"))
        : Stream.succeed(this.initialBody);
    }

    let initialPending = this.initialBody.byteLength > 0;
    const pull = Effect.tryPromise({
      try: async () => {
        if (initialPending) {
          initialPending = false;
          return { done: false as const, chunk: this.initialBody };
        }
        const chunk = await this.nextChunk();
        return chunk === undefined ? { done: true as const } : { done: false as const, chunk };
      },
      catch: (cause) => decodeError(this.request, this, "stream chunk decoding failed", cause),
    }).pipe(
      Effect.flatMap((state) => (state.done ? Cause.done() : Effect.succeed(Arr.of(state.chunk)))),
    );

    return Stream.fromPull(Effect.succeed(pull));
  }

  private async nextChunk(): Promise<Uint8Array | undefined> {
    if (!this.readChunk) return undefined;
    while (true) {
      const chunk = this.readChunk();
      if (chunk === undefined) return undefined;
      if (chunk === null) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        continue;
      }
      return new Uint8Array(chunk);
    }
  }

  private collectBodyBytes(): Promise<Uint8Array> {
    if (this.bodyBytesPromise) return this.bodyBytesPromise;
    this.bodyBytesPromise = (async () => {
      if (!this.readChunk) {
        return this.initialBody;
      }
      const chunks: Array<Uint8Array> = [];
      if (this.initialBody.byteLength > 0) {
        chunks.push(this.initialBody);
      }
      while (true) {
        const chunk = await this.nextChunk();
        if (chunk === undefined) break;
        chunks.push(chunk);
      }
      if (chunks.length === 0) {
        return new Uint8Array(0);
      }
      const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
      const merged = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return merged;
    })();
    return this.bodyBytesPromise;
  }
}

const encodeBody = (
  request: Parameters<HttpClient.HttpClient["execute"]>[0],
  body: HttpBody.HttpBody,
): Effect.Effect<
  string | Uint8Array | ArrayBuffer | null | FormData,
  HttpClientError.HttpClientError
> => {
  switch (body._tag) {
    case "Empty":
      return Effect.succeed(null);
    case "Uint8Array":
      return Effect.succeed(body.body);
    case "Raw": {
      if (typeof body.body === "string") return Effect.succeed(body.body);
      if (body.body instanceof ArrayBuffer) return Effect.succeed(body.body);
      if (ArrayBuffer.isView(body.body)) {
        const bytes = new Uint8Array(body.body.byteLength);
        bytes.set(new Uint8Array(body.body.buffer, body.body.byteOffset, body.body.byteLength));
        return Effect.succeed(bytes.buffer);
      }
      return Effect.fail(transportError(request, "unsupported raw request body"));
    }
    case "FormData":
      return Effect.succeed(body.formData);
    case "Stream":
      return Stream.runCollect(body.stream).pipe(
        Effect.map((chunks) => {
          const buffers = Array.from(chunks);
          const size = buffers.reduce((total, chunk) => total + chunk.byteLength, 0);
          const merged = new Uint8Array(size);
          let offset = 0;
          for (const chunk of buffers) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          return merged;
        }),
        Effect.mapError((cause) =>
          transportError(request, "stream request body encoding failed", cause),
        ),
      );
  }
};

const bodyContentType = (body: HttpBody.HttpBody): string | undefined => {
  switch (body._tag) {
    case "Empty":
      return undefined;
    case "Uint8Array":
    case "Raw":
    case "Stream":
      return body.contentType;
    case "FormData":
      return "multipart/form-data";
  }
};

const bodyContentLength = (body: HttpBody.HttpBody): bigint | number | undefined => {
  switch (body._tag) {
    case "Empty":
      return 0;
    case "Uint8Array":
    case "Raw":
    case "Stream":
      return body.contentLength;
    case "FormData":
      return undefined;
  }
};

const headersToString = (headers: Headers.Headers): string =>
  Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\r\n");

const makeClient = HttpClient.make((request, url, signal, fiber) =>
  Effect.gen(function* () {
    const http = globalThis.http;
    if (!http) {
      return yield* Effect.fail(
        transportError(request, "QuickJS HTTP host module is not available"),
      );
    }

    const encodedBody = yield* encodeBody(request, request.body);

    let headers = request.headers;
    const contentType = bodyContentType(request.body);
    const contentLength = bodyContentLength(request.body);

    if (contentType && !Headers.has(headers, "content-type")) {
      headers = Headers.set(headers, "content-type", contentType);
    }
    if (contentLength !== undefined && !Headers.has(headers, "content-length")) {
      headers = Headers.set(headers, "content-length", String(contentLength));
    }

    const headerString = headersToString(headers);
    const options = fiber.getRef(QuickJSOptions);

    const response = yield* Effect.tryPromise({
      try: () =>
        http.request(
          request.method,
          url.toString(),
          encodedBody,
          headerString,
          options.timeoutSeconds ?? 30,
          {
            signal,
            stream: true,
            ...(options.insecure === undefined ? {} : { insecure: options.insecure }),
            ...(options.follow === undefined ? {} : { follow: options.follow }),
            ...(options.ca === undefined ? {} : { ca: options.ca }),
          },
        ),
      catch: (cause) => transportError(request, "QuickJS HTTP request failed", cause),
    });

    return new QuickJSResponse(request, response);
  }),
);

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = Layer.effect(HttpClient.HttpClient)(
  Effect.acquireRelease(
    Effect.sync(() => {
      globalThis.http?.globalInit?.();
      return makeClient;
    }),
    () =>
      Effect.sync(() => {
        globalThis.http?.globalCleanup?.();
      }),
  ),
);
