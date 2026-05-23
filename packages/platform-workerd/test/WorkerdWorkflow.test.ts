import { env } from "cloudflare:workers";
import { introspectWorkflow } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("WorkerdWorkflow", () => {
  it("executes WorkflowEntrypoint logic inside the Workers workflow runtime", async () => {
    const introspector = await introspectWorkflow(env.WORKFLOW);

    try {
      await introspector.modifyAll(async (modifier) => {
        await modifier.disableSleeps();
      });

      await env.WORKFLOW.create({
        id: `workflow-${crypto.randomUUID()}`,
        params: { value: 41 },
      });

      const [instance] = introspector.get();
      expect(instance).toBeDefined();
      await instance.waitForStatus("complete");
      expect(await instance.getOutput()).toBe(42);
    } finally {
      await introspector.dispose();
    }
  });
});
