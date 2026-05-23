/**
 * @since 1.0.0
 */
import * as Logger from "effect/Logger";

export const make = Logger.make<unknown, void>((options) => {
  const timestamp = options.date.toISOString();
  const level = String(options.logLevel);
  globalThis.console.error(`[${timestamp}] ${level}: ${String(options.message)}`);
});

export const layer = Logger.layer([make]);
