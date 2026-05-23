export type TiLlrtChunk = string | Uint8Array;

export type TiLlrtSignalName =
  | "SIGABRT"
  | "SIGALRM"
  | "SIGHUP"
  | "SIGINT"
  | "SIGTERM"
  | "SIGTSTP"
  | "SIGCONT"
  | "SIGUSR1"
  | "SIGUSR2"
  | "SIGWINCH"
  | (string & {});

export type TiLlrtDataListener = (chunk: Uint8Array) => void;
export type TiLlrtSignalListener = (signal: TiLlrtSignalName) => void;

export interface TiLlrtStdioPipe {
  readonly onData?: (listener: TiLlrtDataListener) => void;
  readonly offData?: (listener: TiLlrtDataListener) => void;
  readonly write?: (chunk: TiLlrtChunk) => void;
  readonly setRawMode?: (enabled: boolean) => void;
  readonly isTTY?: () => boolean;
  readonly columns?: () => number;
  readonly rows?: () => number;
  readonly ref?: () => void;
  readonly unref?: () => void;
}

export interface TiLlrtSignalFacade {
  readonly on: (signal: TiLlrtSignalName, listener: TiLlrtSignalListener) => void;
  readonly off: (signal: TiLlrtSignalName, listener: TiLlrtSignalListener) => void;
}

export interface TiLlrtChildProcessOptions {
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string | undefined;
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly detached?: boolean | undefined;
  readonly stdin?: "pipe" | "inherit" | "ignore" | undefined;
  readonly stdout?: "pipe" | "inherit" | "ignore" | undefined;
  readonly stderr?: "pipe" | "inherit" | "ignore" | undefined;
}

export interface TiLlrtChildExit {
  readonly code: number | null;
  readonly signal: TiLlrtSignalName | null;
}

export interface TiLlrtChildProcessHandle {
  readonly pid: number;
  readonly stdin?: TiLlrtStdioPipe | undefined;
  readonly stdout?: TiLlrtStdioPipe | undefined;
  readonly stderr?: TiLlrtStdioPipe | undefined;
  readonly exit: Promise<TiLlrtChildExit>;
  readonly kill: (signal?: TiLlrtSignalName | number) => boolean;
  readonly ref?: () => void;
  readonly unref?: () => void;
}

export interface TiLlrtChildProcessFacade {
  readonly spawn: (
    command: string,
    options: TiLlrtChildProcessOptions,
  ) => TiLlrtChildProcessHandle;
}

export interface TiLlrtHostDriver {
  readonly argv?: ReadonlyArray<string> | undefined;
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly pid?: number | undefined;
  readonly platform?: string | undefined;
  readonly cwd?: (() => string) | undefined;
  readonly exit?: ((code?: number) => never) | undefined;
  readonly stdio: {
    readonly stdin: TiLlrtStdioPipe;
    readonly stdout: TiLlrtStdioPipe;
    readonly stderr: TiLlrtStdioPipe;
  };
  readonly signals?: TiLlrtSignalFacade | undefined;
  readonly childProcess?: TiLlrtChildProcessFacade | undefined;
}

export const TI_LLRT_HOST_GLOBAL = "__ti_llrt_host";

export type TiLlrtGlobal = typeof globalThis & {
  __ti_llrt_host?: TiLlrtHostDriver | undefined;
  process?: unknown;
  require?: ((id: string) => unknown) | undefined;
};
