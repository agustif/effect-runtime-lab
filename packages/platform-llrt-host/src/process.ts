import { TiLlrtEventEmitter } from "./events.ts";
import type {
  TiLlrtChunk,
  TiLlrtDataListener,
  TiLlrtHostDriver,
  TiLlrtSignalListener,
  TiLlrtSignalName,
  TiLlrtStdioPipe,
} from "./host-api.ts";

const encoder = new TextEncoder();

const toBytes = (chunk: TiLlrtChunk): Uint8Array =>
  typeof chunk === "string" ? encoder.encode(chunk) : chunk;

const isSignalName = (event: string): event is TiLlrtSignalName => event.startsWith("SIG");

export class TiLlrtProcessStream extends TiLlrtEventEmitter {
  readonly fd: 0 | 1 | 2;
  private readonly pipe: TiLlrtStdioPipe;

  constructor(
    fd: 0 | 1 | 2,
    pipe: TiLlrtStdioPipe,
  ) {
    super();
    this.fd = fd;
    this.pipe = pipe;
  }

  get isTTY(): boolean {
    return this.pipe.isTTY?.() ?? false;
  }

  get columns(): number | undefined {
    return this.pipe.columns?.();
  }

  get rows(): number | undefined {
    return this.pipe.rows?.();
  }

  setRawMode(enabled: boolean): this {
    this.pipe.setRawMode?.(enabled);
    return this;
  }

  setEncoding(_encoding: string): this {
    return this;
  }

  pause(): this {
    return this;
  }

  resume(): this {
    return this;
  }

  ref(): this {
    this.pipe.ref?.();
    return this;
  }

  unref(): this {
    this.pipe.unref?.();
    return this;
  }

  write(chunk: TiLlrtChunk, callback?: (error?: Error | null) => void): boolean {
    try {
      this.pipe.write?.(chunk);
      callback?.(null);
      return true;
    } catch (cause) {
      callback?.(cause instanceof Error ? cause : new Error(String(cause)));
      return false;
    }
  }

  override on(event: string, listener: (...args: ReadonlyArray<unknown>) => void): this {
    if (event === "data") {
      this.pipe.onData?.(listener as TiLlrtDataListener);
    }
    return super.on(event, listener);
  }

  override off(event: string, listener: (...args: ReadonlyArray<unknown>) => void): this {
    if (event === "data") {
      this.pipe.offData?.(listener as TiLlrtDataListener);
    }
    return super.off(event, listener);
  }

  override removeListener(event: string, listener: (...args: ReadonlyArray<unknown>) => void): this {
    return this.off(event, listener);
  }

  emitData(chunk: TiLlrtChunk): void {
    this.emit("data", toBytes(chunk));
  }
}

export class TiLlrtProcess extends TiLlrtEventEmitter {
  readonly stdin: TiLlrtProcessStream;
  readonly stdout: TiLlrtProcessStream;
  readonly stderr: TiLlrtProcessStream;
  readonly argv: ReadonlyArray<string>;
  readonly env: Record<string, string>;
  readonly pid: number;
  readonly platform: string;
  readonly versions: Readonly<Record<string, string>>;
  readonly release = { name: "ti-llrt-host" };
  private readonly driver: TiLlrtHostDriver;

  constructor(driver: TiLlrtHostDriver) {
    super();
    this.driver = driver;
    this.stdin = new TiLlrtProcessStream(0, driver.stdio.stdin);
    this.stdout = new TiLlrtProcessStream(1, driver.stdio.stdout);
    this.stderr = new TiLlrtProcessStream(2, driver.stdio.stderr);
    this.argv = driver.argv ?? ["ti-llrt-host"];
    this.env = normalizeEnv(driver.env);
    this.pid = driver.pid ?? 1;
    this.platform = driver.platform ?? "llrt";
    this.versions = { llrt: "custom-host" };
  }

  cwd(): string {
    return this.driver.cwd?.() ?? "/";
  }

  exit(code?: number): never {
    if (this.driver.exit) {
      return this.driver.exit(code);
    }
    throw new Error(`ti-llrt-host exit(${code ?? 0}) requested without native exit hook`);
  }

  override on(event: string, listener: (...args: ReadonlyArray<unknown>) => void): this {
    if (isSignalName(event)) {
      this.driver.signals?.on(event, listener as TiLlrtSignalListener);
    }
    return super.on(event, listener);
  }

  override off(event: string, listener: (...args: ReadonlyArray<unknown>) => void): this {
    if (isSignalName(event)) {
      this.driver.signals?.off(event, listener as TiLlrtSignalListener);
    }
    return super.off(event, listener);
  }

  override removeListener(event: string, listener: (...args: ReadonlyArray<unknown>) => void): this {
    return this.off(event, listener);
  }
}

export const makeProcess = (driver: TiLlrtHostDriver): TiLlrtProcess => new TiLlrtProcess(driver);

const normalizeEnv = (
  env: Readonly<Record<string, string | undefined>> | undefined,
): Record<string, string> => {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(env ?? {})) {
    if (value !== undefined) {
      normalized[key] = value;
    }
  }
  return normalized;
};
