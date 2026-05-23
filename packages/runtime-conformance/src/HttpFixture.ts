import { createServer } from "node:http";

export const withHttpFixtureServer = async <A>(
  run: (baseUrl: string) => Promise<A>,
): Promise<A> => {
  const server = createServer((req, res) => {
    if (req.url === "/json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "hello from runtime fixture" }));
      return;
    }
    if (req.url === "/cookies") {
      res.writeHead(200, {
        "content-type": "text/plain",
        "set-cookie": ["a=1; Path=/", "b=2; Path=/"],
      });
      res.end("cookies");
      return;
    }
    if (req.url === "/binary") {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(Buffer.from([0, 255, 1, 2, 3, 128]));
      return;
    }
    if (req.url === "/invalid-json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{ invalid json");
      return;
    }
    if (req.url === "/head" && req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end();
      return;
    }
    if (req.url === "/echo-json" && req.method === "POST") {
      const chunks: Array<Uint8Array> = [];
      req.on("data", (chunk) =>
        chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk),
      );
      req.on("end", () => {
        const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(body);
      });
      return;
    }
    if (req.url === "/upload-bytes" && req.method === "POST") {
      const chunks: Array<Uint8Array> = [];
      req.on("data", (chunk) =>
        chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk),
      );
      req.on("end", () => {
        const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            length: body.byteLength,
            contentType: req.headers["content-type"] ?? "",
          }),
        );
      });
      return;
    }
    if (req.url === "/upload-form" && req.method === "POST") {
      const chunks: Array<Uint8Array> = [];
      req.on("data", (chunk) =>
        chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk),
      );
      req.on("end", () => {
        const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            length: body.byteLength,
            contentType: req.headers["content-type"] ?? "",
            bodyPreview: body.toString("utf8").slice(0, 500),
          }),
        );
      });
      return;
    }
    if (req.url === "/upload-form-strict" && req.method === "POST") {
      const chunks: Array<Uint8Array> = [];
      req.on("data", (chunk) =>
        chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk),
      );
      req.on("end", () => {
        const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
        const contentType = String(req.headers["content-type"] ?? "");
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        const boundary = boundaryMatch?.[1];
        const payload = body.toString("utf8");
        const hasBoundary = boundary ? payload.includes(`--${boundary}`) : false;
        if (!boundary || !hasBoundary) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              error: "missing-boundary",
              contentType,
            }),
          );
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            length: body.byteLength,
            contentType,
            bodyPreview: payload.slice(0, 500),
          }),
        );
      });
      return;
    }
    if (req.url === "/redirect") {
      res.writeHead(302, { location: "/json" });
      res.end("redirect");
      return;
    }
    if (req.url === "/slow") {
      setTimeout(() => {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("slow response");
      }, 200);
      return;
    }
    if (req.url === "/malformed") {
      res.writeHead(200, { "content-type": "application/json" });
      res.write('{"partial":');
      res.socket?.destroy();
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("http fixture failed to resolve a TCP address");
    }
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};
