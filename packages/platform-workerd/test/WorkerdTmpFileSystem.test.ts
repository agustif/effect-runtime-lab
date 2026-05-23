import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as WorkerdTmpFileSystem from "../src/unstable/WorkerdTmpFileSystem.ts";

describe("WorkerdTmpFileSystem", () => {
  it("supports tmp filesystem operations with node:fs compatibility enabled", async () => {
    const fs = WorkerdTmpFileSystem.make();
    const directory = `/tmp/effect-workerd-${Date.now()}`;
    const file = `${directory}/sample.txt`;

    await Effect.runPromise(fs.makeDirectory(directory));
    await Effect.runPromise(fs.writeFile(file, "ok"));

    expect(await Effect.runPromise(fs.readText(file))).toBe("ok");
    expect(await Effect.runPromise(fs.exists(file))).toBe(true);

    await Effect.runPromise(fs.remove(directory));

    expect(await Effect.runPromise(fs.exists(file))).toBe(false);
  });
});
