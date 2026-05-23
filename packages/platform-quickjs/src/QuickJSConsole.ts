/**
 * @since 1.0.0
 *
 * QuickJS-native Console implementation using the `std` module.
 */
import * as Console from "effect/Console";
import * as Layer from "effect/Layer";

declare const globalThis: {
  std?: {
    out: {
      puts: (s: string) => void;
    };
    err: {
      puts: (s: string) => void;
    };
  };
};

const formatValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return String(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === "object") {
    // Use an ancestor stack to detect true cycles without false-positiving
    // on non-circular shared references. The replacer's `this` is the holder
    // object, so we can prune the stack when we backtrack up the tree.
    const ancestors: Array<unknown> = [];
    try {
      return JSON.stringify(
        value,
        function (this: unknown, _key: string, candidate: unknown) {
          if (typeof candidate === "object" && candidate !== null) {
            // Trim ancestors: `this` is the holder of the current key.
            // Pop ancestors until the top is the holder (or stack is empty).
            while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
              ancestors.pop();
            }
            if (ancestors.includes(candidate)) return "[Circular]";
            ancestors.push(candidate);
          }
          return candidate;
        },
        2,
      );
    } catch (cause) {
      return `[Unserializable ${(cause as Error)?.message ?? "value"}]`;
    }
  }
  return String(value);
};

const format = (args: ReadonlyArray<unknown>): string =>
  args.map((arg) => formatValue(arg)).join(" ");

const writeStdout = (message: string) => {
  globalThis.std?.out.puts(message);
};

const writeStderr = (message: string) => {
  globalThis.std?.err.puts(message);
};

const counters = new Map<string, number>();
const timers = new Map<string, number>();
const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const runtimeConsole: Console.Console = {
  assert(condition, ...args) {
    if (!condition) {
      writeStderr(`ASSERTION FAILED: ${format(args)}\n`);
    }
  },
  clear() {
    writeStdout("\x1Bc");
  },
  count(label) {
    const key = label ?? "default";
    const value = (counters.get(key) ?? 0) + 1;
    counters.set(key, value);
    writeStdout(`${key}: ${value}\n`);
  },
  countReset(label) {
    const key = label ?? "default";
    if (!counters.has(key)) {
      writeStderr(`WARN: No such label '${key}' for console.countReset()\n`);
      return;
    }
    counters.delete(key);
  },
  debug(...args) {
    writeStdout(`DEBUG: ${format(args)}\n`);
  },
  dir(item, options) {
    writeStdout(`${JSON.stringify(item, null, options?.depth ?? 2)}\n`);
  },
  dirxml(...args) {
    writeStdout(`${format(args)}\n`);
  },
  error(...args) {
    writeStderr(`ERROR: ${format(args)}\n`);
  },
  group(...args) {
    writeStdout(`${format(args)}\n`);
  },
  groupCollapsed(...args) {
    writeStdout(`${format(args)}\n`);
  },
  groupEnd() {
    return;
  },
  info(...args) {
    writeStdout(`INFO: ${format(args)}\n`);
  },
  log(...args) {
    writeStdout(`${format(args)}\n`);
  },
  table(tabularData) {
    writeStdout(`${JSON.stringify(tabularData, null, 2)}\n`);
  },
  time(label) {
    const key = label ?? "default";
    timers.set(key, now());
  },
  timeEnd(label) {
    const key = label ?? "default";
    const start = timers.get(key);
    if (start === undefined) {
      writeStderr(`WARN: No such label '${key}' for console.timeEnd()\n`);
      return;
    }
    const duration = now() - start;
    timers.delete(key);
    writeStdout(`${key}: ${duration.toFixed(3)}ms\n`);
  },
  timeLog(label, ...args) {
    const key = label ?? "default";
    const start = timers.get(key);
    if (start === undefined) {
      writeStderr(`WARN: No such label '${key}' for console.timeLog()\n`);
      return;
    }
    const duration = now() - start;
    const suffix = args.length > 0 ? ` ${format(args)}` : "";
    writeStdout(`${key}: ${duration.toFixed(3)}ms${suffix}\n`);
  },
  trace(...args) {
    writeStderr(`TRACE: ${format(args)}\n`);
  },
  warn(...args) {
    writeStderr(`WARN: ${format(args)}\n`);
  },
};

export const layer = Layer.succeed(Console.Console)(runtimeConsole);
