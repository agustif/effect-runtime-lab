#!/usr/bin/env bun

import { execSync, spawn } from "node:child_process"
import { createServer } from "node:http"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, "..")
const hostBinary = join(packageRoot, "bin", "effect-quickjs-host")
const distDir = join(packageRoot, "dist-prod")

execSync(`bun ${join(packageRoot, "scripts", "build-host.mjs")}`, { stdio: "inherit" })

if (!existsSync(hostBinary)) {
  throw new Error("host binary missing")
}

const server = createServer((req, res) => {
  if (req.url === "/json") {
    res.writeHead(200, { "content-type": "application/json" })
    res.end(JSON.stringify({ message: "hello from quickjs server" }))
    return
  }
  if (req.url === "/cookies") {
    res.writeHead(200, {
      "content-type": "text/plain",
      "set-cookie": ["a=1; Path=/", "b=2; Path=/"]
    })
    res.end("cookies")
    return
  }
  if (req.url === "/binary") {
    res.writeHead(200, { "content-type": "application/octet-stream" })
    res.end(Buffer.from([0, 255, 1, 2, 3, 128]))
    return
  }
  if (req.url === "/invalid-json") {
    res.writeHead(200, { "content-type": "application/json" })
    res.end("{ invalid json")
    return
  }
  if (req.url === "/head" && req.method === "HEAD") {
    res.writeHead(200, { "content-type": "application/json" })
    res.end()
    return
  }
  if (req.url === "/echo-json" && req.method === "POST") {
    const chunks = []
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on("end", () => {
      const body = Buffer.concat(chunks)
      res.writeHead(200, { "content-type": "application/json" })
      res.end(body)
    })
    return
  }
  if (req.url === "/upload-bytes" && req.method === "POST") {
    const chunks = []
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on("end", () => {
      const body = Buffer.concat(chunks)
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({
        length: body.byteLength,
        contentType: req.headers["content-type"] ?? ""
      }))
    })
    return
  }
  if (req.url === "/upload-form" && req.method === "POST") {
    const chunks = []
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on("end", () => {
      const body = Buffer.concat(chunks)
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({
        length: body.byteLength,
        contentType: req.headers["content-type"] ?? "",
        bodyPreview: body.toString("utf8").slice(0, 500)
      }))
    })
    return
  }
  if (req.url === "/upload-form-strict" && req.method === "POST") {
    const chunks = []
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on("end", () => {
      const body = Buffer.concat(chunks)
      const contentType = String(req.headers["content-type"] ?? "")
      const boundaryMatch = contentType.match(/boundary=([^;]+)/i)
      const boundary = boundaryMatch?.[1]
      const payload = body.toString("utf8")
      const hasBoundary = boundary ? payload.includes(`--${boundary}`) : false
      if (!boundary || !hasBoundary) {
        res.writeHead(400, { "content-type": "application/json" })
        res.end(JSON.stringify({
          error: "missing-boundary",
          contentType
        }))
        return
      }
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({
        length: body.byteLength,
        contentType,
        bodyPreview: payload.slice(0, 500)
      }))
    })
    return
  }
  if (req.url === "/redirect") {
    res.writeHead(302, { location: "/json" })
    res.end("redirect")
    return
  }
  if (req.url === "/slow") {
    setTimeout(() => {
      res.writeHead(200, { "content-type": "text/plain" })
      res.end("slow response")
    }, 200)
    return
  }
  if (req.url === "/malformed") {
    res.writeHead(200, { "content-type": "application/json" })
    res.write("{\"partial\":")
    res.socket?.destroy()
    return
  }
  res.writeHead(404, { "content-type": "text/plain" })
  res.end("not found")
})

await new Promise((resolve, reject) => {
  server.once("error", reject)
  server.listen(0, "127.0.0.1", resolve)
})

const address = server.address()
if (!address || typeof address === "string") {
  throw new Error("quickjs fixture server failed to bind a TCP port")
}

execSync(`bun ${join(packageRoot, "scripts", "bundle-prod.mjs")}`, {
  stdio: "inherit",
  env: {
    ...process.env,
    FIXTURE_BASE_URL: `http://127.0.0.1:${address.port}`
  }
})

const tests = ["runtime.prod.js", "filesystem.prod.js", "path.prod.js", "httpclient.prod.js", "watch.prod.js"]
let failed = false
for (const test of tests) {
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(hostBinary, [join(distDir, test)], {
        stdio: "inherit",
        cwd: packageRoot
      })
      child.once("error", reject)
      child.once("exit", (code, signal) => {
        if (code === 0) {
          resolve(undefined)
          return
        }
        reject(new Error(`quickjs prod file failed: ${test} (code=${code ?? "null"} signal=${signal ?? "none"})`))
      })
    })
  } catch {
    failed = true
  }
}

await new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve())
})

if (failed) {
  throw new Error("quickjs production lane failed")
}
