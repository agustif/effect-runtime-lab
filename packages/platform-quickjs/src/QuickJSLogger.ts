/**
 * @since 1.0.0
 *
 * QuickJS-native Logger implementation.
 */
import * as Logger from "effect/Logger"

declare const globalThis: {
  std?: {
    err: {
      puts: (s: string) => void
    }
  }
}

export const make = Logger.make<unknown, void>((options) => {
  const timestamp = options.date.toISOString()
  const level = String(options.logLevel)
  globalThis.std?.err.puts(`[${timestamp}] ${level}: ${String(options.message)}\n`)
})

export const layer = Logger.layer([make])
