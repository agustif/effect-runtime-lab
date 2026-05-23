#!/usr/bin/env bun

import { execSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
const txikiBinary = resolve(repoRoot, ".tmp-runtime-evals/txikijs/build/tjs");
const distDir = join(packageRoot, "dist-prod");

if (!existsSync(txikiBinary)) {
  throw new Error(`txiki binary missing: ${txikiBinary}`);
}

rmSync(distDir, { force: true, recursive: true });
mkdirSync(distDir, { recursive: true });

const prodFiles = [
  "runtime.prod.ts",
  "path.prod.ts",
  "filesystem.prod.ts",
  "httpclient.prod.ts",
  "watch.prod.ts",
];

const server = createServer((req, res) => {
  if (req.url === "/json") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "hello from txiki server" }));
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
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
    });
    return;
  }
  if (req.url === "/upload-bytes" && req.method === "POST") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
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
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
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
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
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

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("txiki fixture server failed to bind a TCP port");
}
const fixtureBaseUrl = `http://127.0.0.1:${address.port}`;

for (const file of prodFiles) {
  const input = join(packageRoot, "test/prod", file);
  const output = join(distDir, file.replace(/\.ts$/, ".js"));
  const result = await Bun.build({
    entrypoints: [input],
    outfile: output,
    target: "node",
    format: "esm",
    define: {
      __FIXTURE_BASE_URL__: JSON.stringify(fixtureBaseUrl),
    },
  });
  if (!result.success) {
    throw new Error(`failed to bundle txiki prod file: ${file}`);
  }
}

let failed = false;
for (const file of prodFiles) {
  const output = join(distDir, file.replace(/\.ts$/, ".js"));
  try {
    console.log(`running ${file}`);
    await new Promise((resolve, reject) => {
      const child = spawn(txikiBinary, ["run", output], {
        stdio: "inherit",
        cwd: repoRoot,
      });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) {
          resolve(undefined);
          return;
        }
        reject(
          new Error(
            `txiki prod file failed: ${file} (code=${code ?? "null"} signal=${signal ?? "none"})`,
          ),
        );
      });
    });
  } catch {
    failed = true;
  }
}

await new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

if (failed) {
  throw new Error("txiki production lane failed");
}
