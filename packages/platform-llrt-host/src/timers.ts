type TimerCallback = (...args: ReadonlyArray<unknown>) => void;
type TimerHandle = ReturnType<typeof globalThis.setTimeout>;
type ClearTimer = (handle?: unknown) => void;

const nativeTimer = Symbol("ti-llrt-native-timer");

export interface RefableTimerHandle {
  readonly [nativeTimer]: TimerHandle;
  ref: () => RefableTimerHandle;
  unref: () => RefableTimerHandle;
}

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === "object" && value !== null;

const hasRefUnref = (value: unknown): boolean =>
  isRecord(value) && typeof value["ref"] === "function" && typeof value["unref"] === "function";

const wrapTimer = (handle: TimerHandle): TimerHandle | RefableTimerHandle => {
  if (hasRefUnref(handle)) {
    return handle;
  }
  const refable: RefableTimerHandle = {
    [nativeTimer]: handle,
    ref: () => refable,
    unref: () => refable,
  };
  return refable;
};

const unwrapTimer = (handle: TimerHandle | RefableTimerHandle | undefined): unknown =>
  isRecord(handle) && nativeTimer in handle ? handle[nativeTimer] : handle;

export const installTimerRefFacade = (target: typeof globalThis = globalThis): void => {
  const setTimeoutNative = target.setTimeout.bind(target);
  const clearTimeoutNative = target.clearTimeout.bind(target) as ClearTimer;
  const setIntervalNative = target.setInterval.bind(target);
  const clearIntervalNative = target.clearInterval.bind(target) as ClearTimer;

  Object.defineProperties(target, {
    setTimeout: {
      configurable: true,
      writable: true,
      value: (callback: TimerCallback, delay?: number, ...args: ReadonlyArray<unknown>) =>
        wrapTimer(setTimeoutNative(callback, delay, ...args)),
    },
    clearTimeout: {
      configurable: true,
      writable: true,
      value: (handle?: TimerHandle | RefableTimerHandle) => clearTimeoutNative(unwrapTimer(handle)),
    },
    setInterval: {
      configurable: true,
      writable: true,
      value: (callback: TimerCallback, delay?: number, ...args: ReadonlyArray<unknown>) =>
        wrapTimer(setIntervalNative(callback, delay, ...args)),
    },
    clearInterval: {
      configurable: true,
      writable: true,
      value: (handle?: TimerHandle | RefableTimerHandle) => clearIntervalNative(unwrapTimer(handle)),
    },
  });
};
