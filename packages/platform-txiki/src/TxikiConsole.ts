/**
 * @since 1.0.0
 */
import * as Console from "effect/Console";
import * as Layer from "effect/Layer";

const runtimeConsole: Console.Console = globalThis.console;

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = Layer.succeed(Console.Console)(runtimeConsole);
