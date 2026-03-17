if (!globalThis.setTimeout) {
  globalThis.setTimeout = os.setTimeout
  globalThis.clearTimeout = os.clearTimeout
  globalThis.setInterval = os.setInterval
  globalThis.clearInterval = os.clearInterval
}

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = class TextEncoder {
    encode(str) {
      const out = []
      for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i)
        if (code < 0x80) {
          out.push(code)
        } else if (code < 0x800) {
          out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
        } else if (code < 0xd800 || code >= 0xe000) {
          out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
        } else {
          i++
          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
          out.push(
            0xf0 | (code >> 18),
            0x80 | ((code >> 12) & 0x3f),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f)
          )
        }
      }
      return new Uint8Array(out)
    }
  }
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = class TextDecoder {
    decode(input) {
      if (!input) return ""
      const source = input instanceof Uint8Array ? input : new Uint8Array(input)
      if (typeof os.utf8Decode === "function") {
        const bytes = new Uint8Array(source.byteLength)
        bytes.set(new Uint8Array(source.buffer, source.byteOffset, source.byteLength))
        return os.utf8Decode(bytes.buffer)
      }
      let out = ""
      for (let i = 0; i < source.length; i++) {
        out += String.fromCharCode(source[i])
      }
      return out
    }
  }
}

const __blobTextEncoder = new TextEncoder()
const __normalizeBlobPart = (part) => {
  if (part == null) return new Uint8Array(0)
  if (part instanceof Uint8Array) return part
  if (part instanceof ArrayBuffer) return new Uint8Array(part)
  if (ArrayBuffer.isView(part)) {
    return new Uint8Array(part.buffer, part.byteOffset, part.byteLength)
  }
  if (typeof Blob !== "undefined" && part instanceof Blob) {
    return part._getBuffer()
  }
  return __blobTextEncoder.encode(String(part))
}

if (!globalThis.Blob) {
  globalThis.Blob = class Blob {
    #buffer
    #type

    constructor(parts = [], options = {}) {
      const normalized = Array.from(parts, (part) => __normalizeBlobPart(part))
      const size = normalized.reduce((total, part) => total + part.byteLength, 0)
      const merged = new Uint8Array(size)
      let offset = 0
      for (const part of normalized) {
        merged.set(part, offset)
        offset += part.byteLength
      }
      this.#buffer = merged
      this.#type = String(options.type ?? "")
    }

    get size() {
      return this.#buffer.byteLength
    }

    get type() {
      return this.#type
    }

    text() {
      return Promise.resolve(new TextDecoder().decode(this.#buffer))
    }

    arrayBuffer() {
      const out = new Uint8Array(this.#buffer.byteLength)
      out.set(this.#buffer)
      return Promise.resolve(out.buffer)
    }

    _getBuffer() {
      return this.#buffer
    }
  }
}

if (!globalThis.File) {
  globalThis.File = class File extends Blob {
    constructor(parts = [], name = "blob", options = {}) {
      super(parts, options)
      this.name = String(name)
      this.lastModified = Number(options.lastModified ?? Date.now())
    }
  }
}

if (!globalThis.FormData) {
  globalThis.FormData = class FormData {
    #entries = []

    append(name, value, filename) {
      this.#entries.push([String(name), value, filename])
    }

    *entries() {
      for (const [name, value] of this.#entries) {
        yield [name, value]
      }
    }

    *multipartEntries() {
      for (const entry of this.#entries) {
        yield entry
      }
    }

    [Symbol.iterator]() {
      return this.entries()
    }
  }
}

const processStart = Date.now()
const fallbackProcess = {
  env: {},
  argv: Array.isArray(globalThis.scriptArgs) ? globalThis.scriptArgs.slice() : [],
  version: "quickjs-ng",
  platform: typeof os.platform === "string" ? os.platform : "js",
  cwd: () => {
    const result = os.getcwd()
    return Array.isArray(result) ? (result[0] || "/") : "/"
  },
  uptime: () => (Date.now() - processStart) / 1000,
  memoryUsage: () => (typeof os.memoryUsage === "function" ? os.memoryUsage() : { rss: 0 }),
  stdout: {
    write: (value) => {
      const text = typeof value === "string" ? value : new TextDecoder().decode(value)
      std.out.puts(text)
      return true
    }
  },
  stderr: {
    write: (value) => {
      const text = typeof value === "string" ? value : new TextDecoder().decode(value)
      std.err.puts(text)
      return true
    }
  },
  nextTick: (fn, ...args) => queueMicrotask(() => fn(...args))
}

globalThis.process = {
  ...(globalThis.process || {}),
  ...fallbackProcess
}

if (!globalThis.process.exit) {
  globalThis.process.exit = (code = 0) => std.exit(code)
}
