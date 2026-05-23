export interface CuratedCaseResult {
  readonly name: string;
  readonly status: "passed" | "failed";
  readonly durationMs: number;
  readonly error?: string;
  readonly failureType?: "runtime-bug" | "missing-platform-api" | "harness-mismatch" | "unknown";
}

type FailureType = NonNullable<CuratedCaseResult["failureType"]>;

const classifyFailure = (error: string): FailureType => {
  const message = error.toLowerCase();
  if (
    message.includes("not implemented") ||
    message.includes("not available") ||
    message.includes("unsupported")
  ) {
    return "missing-platform-api";
  }
  if (message.includes("harness") || message.includes("fixture") || message.includes("timeout")) {
    return "harness-mismatch";
  }
  if (message.includes("unknown")) {
    return "unknown";
  }
  return "runtime-bug";
};

export const runCase = async (
  name: string,
  run: () => Promise<void>,
): Promise<CuratedCaseResult> => {
  const startedAt = performance.now();
  try {
    await run();
    return {
      name,
      status: "passed",
      durationMs: Number((performance.now() - startedAt).toFixed(3)),
    };
  } catch (error) {
    const rendered = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return {
      name,
      status: "failed",
      durationMs: Number((performance.now() - startedAt).toFixed(3)),
      error: rendered,
      failureType: classifyFailure(rendered),
    };
  }
};
