import { describe, expect, it, vi } from "vitest";
import {
  installTiLlrtHost,
  installTimerRefFacade,
  makeChildProcessModule,
  makeProcess,
} from "../src/index.ts";
import type {
  TiLlrtDataListener,
  TiLlrtHostDriver,
  TiLlrtSignalListener,
  TiLlrtSignalName,
  TiLlrtStdioPipe,
} from "../src/index.ts";

class MemoryPipe implements TiLlrtStdioPipe {
  readonly dataListeners = new Set<TiLlrtDataListener>();
  readonly writes: Array<string | Uint8Array> = [];
  rawMode = false;

  onData(listener: TiLlrtDataListener): void {
    this.dataListeners.add(listener);
  }

  offData(listener: TiLlrtDataListener): void {
    this.dataListeners.delete(listener);
  }

  write(chunk: string | Uint8Array): void {
    this.writes.push(chunk);
  }

  setRawMode(enabled: boolean): void {
    this.rawMode = enabled;
  }

  isTTY(): boolean {
    return true;
  }

  columns(): number {
    return 120;
  }

  rows(): number {
    return 40;
  }

  emit(chunk: Uint8Array): void {
    for (const listener of Array.from(this.dataListeners)) {
      listener(chunk);
    }
  }
}

const makeDriver = (): TiLlrtHostDriver & {
  readonly pipes: {
    readonly stdin: MemoryPipe;
    readonly stdout: MemoryPipe;
    readonly stderr: MemoryPipe;
  };
  readonly signalListeners: Map<TiLlrtSignalName, Set<TiLlrtSignalListener>>;
} => {
  const stdin = new MemoryPipe();
  const stdout = new MemoryPipe();
  const stderr = new MemoryPipe();
  const signalListeners = new Map<TiLlrtSignalName, Set<TiLlrtSignalListener>>();
  return {
    argv: ["ti-code", "chat", "hello"],
    env: { TERM: "xterm-256color", OMIT: undefined },
    pid: 42,
    platform: "llrt",
    stdio: { stdin, stdout, stderr },
    signals: {
      on: (signal, listener) => {
        const listeners = signalListeners.get(signal) ?? new Set<TiLlrtSignalListener>();
        listeners.add(listener);
        signalListeners.set(signal, listeners);
      },
      off: (signal, listener) => {
        signalListeners.get(signal)?.delete(listener);
      },
    },
    pipes: { stdin, stdout, stderr },
    signalListeners,
  };
};

describe("ti LLRT host process facade", () => {
  it("exposes argv/env stdio TTY raw mode and signal registration", () => {
    const driver = makeDriver();
    const process = makeProcess(driver);
    const data = vi.fn<(chunk: Uint8Array) => void>();
    const signal = vi.fn<(signal: TiLlrtSignalName) => void>();

    process.stdin.on("data", data);
    process.stdin.setRawMode(true);
    driver.pipes.stdin.emit(new TextEncoder().encode("x"));
    process.stdout.write("out");
    process.stderr.write("err");
    process.on("SIGINT", signal);
    process.off("SIGINT", signal);

    expect(process.argv).toEqual(["ti-code", "chat", "hello"]);
    expect(process.env).toEqual({ TERM: "xterm-256color" });
    expect(process.stdin.isTTY).toBe(true);
    expect(process.stdout.columns).toBe(120);
    expect(driver.pipes.stdin.rawMode).toBe(true);
    expect(data).toHaveBeenCalledWith(new TextEncoder().encode("x"));
    expect(driver.pipes.stdout.writes).toEqual(["out"]);
    expect(driver.pipes.stderr.writes).toEqual(["err"]);
    expect(driver.signalListeners.get("SIGINT")?.size ?? 0).toBe(0);
  });
});

describe("ti LLRT host child_process facade", () => {
  it("forwards spawn options, stdout data, and exit events", async () => {
    const driver = makeDriver();
    const childStdout = new MemoryPipe();
    const exit = Promise.resolve({ code: 0, signal: null });
    const spawn = vi.fn(() => ({
      pid: 7,
      stdout: childStdout,
      exit,
      kill: () => true,
    }));
    const module = makeChildProcessModule({
      ...driver,
      childProcess: { spawn },
    });
    const child = module.spawn("echo", ["ok"], { cwd: "/tmp", stdio: ["ignore", "pipe", "pipe"] });
    const stdout = vi.fn<(chunk: Uint8Array) => void>();
    const close = vi.fn<(code: number | null, signal: TiLlrtSignalName | null) => void>();

    child.stdout?.on("data", stdout);
    child.on("close", close);
    childStdout.emit(new TextEncoder().encode("ok\n"));
    await exit;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

    expect(child.pid).toBe(7);
    expect(spawn).toHaveBeenCalledWith("echo", {
      args: ["ok"],
      cwd: "/tmp",
      env: undefined,
      detached: undefined,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout).toHaveBeenCalledWith(new TextEncoder().encode("ok\n"));
    expect(close).toHaveBeenCalledWith(0, null);
  });
});

describe("ti LLRT host installation", () => {
  it("installs process, require facade, and refable timers", () => {
    const driver = makeDriver();
    const target = {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
    } as typeof globalThis;

    installTiLlrtHost(driver, {}, target);
    const timer = target.setTimeout(() => {}, 1) as unknown as { ref: () => unknown; unref: () => unknown };
    target.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>);

    expect(target.process).toBeDefined();
    expect(target.require?.("node:child_process")).toBeDefined();
    expect(typeof timer.ref).toBe("function");
    expect(typeof timer.unref).toBe("function");
  });

  it("can wrap numeric timer handles for LLRT-style timer APIs", () => {
    const clearTimeoutNative = vi.fn();
    const clearIntervalNative = vi.fn();
    const target = {
      setTimeout: vi.fn(() => 123),
      clearTimeout: clearTimeoutNative,
      setInterval: vi.fn(() => 456),
      clearInterval: clearIntervalNative,
    } as unknown as typeof globalThis;

    installTimerRefFacade(target);
    const timeout = target.setTimeout(() => {}, 1) as unknown as { ref: () => unknown; unref: () => unknown };
    const interval = target.setInterval(() => {}, 1) as unknown as { ref: () => unknown; unref: () => unknown };
    target.clearTimeout(timeout as ReturnType<typeof globalThis.setTimeout>);
    target.clearInterval(interval as ReturnType<typeof globalThis.setInterval>);

    expect(typeof timeout.ref).toBe("function");
    expect(typeof interval.unref).toBe("function");
    expect(clearTimeoutNative).toHaveBeenCalledWith(123);
    expect(clearIntervalNative).toHaveBeenCalledWith(456);
  });
});
