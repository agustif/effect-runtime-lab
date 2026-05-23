import * as Effect from "effect/Effect";
import * as Runtime from "effect/Runtime";

export interface RuntimeMainHarness {
  readonly exitCodes: Array<number>;
  readonly registrations: Array<{
    readonly op: "add" | "remove";
    readonly signal: string;
  }>;
  run(effect: Effect.Effect<unknown, unknown>): void;
  emit(signal: "SIGINT" | "SIGTERM"): void;
}

const waitFor = async (predicate: () => boolean, label: string) => {
  for (let index = 0; index < 100; index++) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`runtime main contract timed out waiting for ${label}`);
};

export const verifyBasicRuntimeMain = async (makeHarness: () => RuntimeMainHarness) => {
  {
    const harness = makeHarness();
    harness.run(Effect.void);
    await waitFor(
      () =>
        harness.registrations.some((entry) => entry.op === "remove" && entry.signal === "SIGINT") &&
        harness.registrations.some((entry) => entry.op === "remove" && entry.signal === "SIGTERM"),
      "success cleanup",
    );
    if (harness.exitCodes.length !== 0) {
      throw new Error(
        `runtime main success must not force exit(0): ${JSON.stringify(harness.exitCodes)}`,
      );
    }
    if (!harness.registrations.some((entry) => entry.op === "add" && entry.signal === "SIGINT")) {
      throw new Error("runtime main must register SIGINT");
    }
    if (!harness.registrations.some((entry) => entry.op === "add" && entry.signal === "SIGTERM")) {
      throw new Error("runtime main must register SIGTERM");
    }
    if (
      !harness.registrations.some((entry) => entry.op === "remove" && entry.signal === "SIGINT")
    ) {
      throw new Error("runtime main must remove SIGINT");
    }
    if (
      !harness.registrations.some((entry) => entry.op === "remove" && entry.signal === "SIGTERM")
    ) {
      throw new Error("runtime main must remove SIGTERM");
    }
  }

  {
    const harness = makeHarness();
    const error = Object.assign(new Error("boom"), {
      [Runtime.errorExitCode]: 7,
    });
    harness.run(Effect.fail(error));
    await waitFor(() => harness.exitCodes.length === 1, "failure exit");
    if (harness.exitCodes[0] !== 7) {
      throw new Error(
        `runtime main failure exit contract failed: ${JSON.stringify(harness.exitCodes)}`,
      );
    }
  }

  {
    const harness = makeHarness();
    harness.run(Effect.never);
    harness.emit("SIGINT");
    await waitFor(() => harness.exitCodes.length === 1, "interrupt exit");
    if (harness.exitCodes[0] !== 130) {
      throw new Error(
        `runtime main interrupt exit contract failed: ${JSON.stringify(harness.exitCodes)}`,
      );
    }
  }
};
