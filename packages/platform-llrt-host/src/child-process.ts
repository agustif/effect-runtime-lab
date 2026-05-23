import { TiLlrtEventEmitter } from "./events.ts";
import type {
  TiLlrtChildExit,
  TiLlrtChildProcessHandle,
  TiLlrtHostDriver,
  TiLlrtSignalName,
} from "./host-api.ts";
import { TiLlrtProcessStream } from "./process.ts";

type SpawnArg = string | ReadonlyArray<string> | SpawnOptions | undefined;
type StdioMode = "pipe" | "inherit" | "ignore";

export interface SpawnOptions {
  readonly cwd?: string | undefined;
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly detached?: boolean | undefined;
  readonly stdio?: StdioMode | ReadonlyArray<StdioMode> | undefined;
}

export class TiLlrtChildProcess extends TiLlrtEventEmitter {
  readonly pid: number;
  readonly stdin: TiLlrtProcessStream | null;
  readonly stdout: TiLlrtProcessStream | null;
  readonly stderr: TiLlrtProcessStream | null;
  private readonly handle: TiLlrtChildProcessHandle;

  constructor(handle: TiLlrtChildProcessHandle) {
    super();
    this.handle = handle;
    this.pid = handle.pid;
    this.stdin = handle.stdin ? new TiLlrtProcessStream(0, handle.stdin) : null;
    this.stdout = handle.stdout ? new TiLlrtProcessStream(1, handle.stdout) : null;
    this.stderr = handle.stderr ? new TiLlrtProcessStream(2, handle.stderr) : null;
    this.observeExit(handle.exit);
  }

  kill(signal?: TiLlrtSignalName | number): boolean {
    return this.handle.kill(signal);
  }

  ref(): void {
    this.handle.ref?.();
  }

  unref(): void {
    this.handle.unref?.();
  }

  private observeExit(exit: Promise<TiLlrtChildExit>): void {
    void exit.then(
      (result) => {
        this.emit("exit", result.code, result.signal);
        this.emit("close", result.code, result.signal);
      },
      (cause) => {
        this.emit("error", cause);
        this.emit("close", 1, null);
      },
    );
  }
}

export const makeChildProcessModule = (driver: TiLlrtHostDriver) => {
  const spawn = (command: string, argsOrOptions?: SpawnArg, maybeOptions?: SpawnOptions) => {
    if (!driver.childProcess) {
      throw new Error("ti-llrt-host childProcess.spawn is unavailable");
    }
    let args: ReadonlyArray<string> = [];
    let options: SpawnOptions = {};
    if (Array.isArray(argsOrOptions)) {
      args = argsOrOptions;
      options = normalizeOptions(maybeOptions);
    } else if (isSpawnOptions(argsOrOptions)) {
      options = argsOrOptions;
    }
    return new TiLlrtChildProcess(
      driver.childProcess.spawn(command, {
        args,
        cwd: options.cwd,
        env: options.env,
        detached: options.detached,
        stdin: stdioAt(options.stdio, 0),
        stdout: stdioAt(options.stdio, 1),
        stderr: stdioAt(options.stdio, 2),
      }),
    );
  };

  return {
    spawn,
    spawnSync: () => {
      throw new Error("ti-llrt-host child_process.spawnSync is not implemented");
    },
    execFileSync: () => {
      throw new Error("ti-llrt-host child_process.execFileSync is not implemented");
    },
  };
};

const normalizeOptions = (value: SpawnOptions | undefined): SpawnOptions => {
  if (!value) {
    return {};
  }
  return value;
};

const isSpawnOptions = (value: SpawnArg): value is SpawnOptions =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stdioAt = (
  stdio: SpawnOptions["stdio"],
  index: 0 | 1 | 2,
): StdioMode => {
  if (Array.isArray(stdio)) {
    return stdio[index] ?? "pipe";
  }
  return typeof stdio === "string" ? stdio : "pipe";
};
