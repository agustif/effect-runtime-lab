import * as Effect from "effect/Effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import * as WorkerdContext from "../src/WorkerdContext.ts";
import * as WorkerdEntrypoint from "../src/WorkerdEntrypoint.ts";

interface Env {
  readonly SERVICE_NAME: string;
}

interface CounterProps {
  readonly counterId: string;
}

export class CounterWorker extends WorkerEntrypoint<Env, CounterProps> {
  increment(by = 1) {
    return WorkerdEntrypoint.runResult(
      this.env,
      this.ctx,
      Effect.gen(function* () {
        const props = yield* WorkerdContext.props<CounterProps>();
        return {
          counterId: props.counterId,
          incrementedBy: by,
        };
      }),
    );
  }
}
