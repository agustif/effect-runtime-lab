import { makeChildProcessModule } from "./child-process.ts";
import type { TiLlrtGlobal, TiLlrtHostDriver } from "./host-api.ts";
import { TI_LLRT_HOST_GLOBAL } from "./host-api.ts";
import { makeProcess } from "./process.ts";
import { installTimerRefFacade } from "./timers.ts";

export interface InstallTiLlrtHostOptions {
  readonly installProcess?: boolean | undefined;
  readonly installRequire?: boolean | undefined;
  readonly installTimers?: boolean | undefined;
}

export const installTiLlrtHost = (
  driver: TiLlrtHostDriver,
  options: InstallTiLlrtHostOptions = {},
  target: TiLlrtGlobal = globalThis as TiLlrtGlobal,
): TiLlrtHostDriver => {
  target[TI_LLRT_HOST_GLOBAL] = driver;

  if (options.installProcess !== false) {
    Object.defineProperty(target, "process", {
      configurable: true,
      writable: true,
      value: makeProcess(driver),
    });
  }

  if (options.installRequire !== false) {
    installRequireFacade(driver, target);
  }

  if (options.installTimers !== false) {
    installTimerRefFacade(target);
  }

  return driver;
};

export const installRequireFacade = (
  driver: TiLlrtHostDriver,
  target: TiLlrtGlobal = globalThis as TiLlrtGlobal,
): void => {
  const previousRequire = target.require;
  const modules = new Map<string, unknown>([
    ["child_process", makeChildProcessModule(driver)],
    ["node:child_process", makeChildProcessModule(driver)],
  ]);

  Object.defineProperty(target, "require", {
    configurable: true,
    writable: true,
    value: (id: string): unknown => {
      if (modules.has(id)) {
        return modules.get(id);
      }
      if (previousRequire) {
        return previousRequire(id);
      }
      throw new Error(`ti-llrt-host cannot require module: ${id}`);
    },
  });
};
