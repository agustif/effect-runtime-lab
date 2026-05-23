import { Array, Fiber, Ref } from "effect";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { flow } from "effect/Function";
import * as Request from "effect/Request";
import * as Resolver from "effect/RequestResolver";

class Counter extends Context.Service<Counter, { count: number }>()("Counter") {}
class Requests extends Context.Service<Requests, { count: number }>()("Requests") {}
const Interrupts = Context.Reference<{ interrupts: number }>("Interrupts", {
  defaultValue: () => ({ interrupts: 0 }),
});
const RequestService = Context.Reference<{ value: string }>("RequestService", {
  defaultValue: () => ({ value: "default" }),
});

const delay = <A, E, R>(self: Effect.Effect<A, E, R>) =>
  Effect.andThen(
    Effect.promise(() => new Promise((resolve) => setTimeout(() => resolve(0), 0))),
    self,
  );

const userIds: ReadonlyArray<number> = Array.range(1, 26);
const userNames: ReadonlyMap<number, string> = new Map(
  Array.zipWith(
    userIds,
    Array.map(Array.range(97, 122), (a) => String.fromCharCode(a)),
    (a, b) => [a, b] as const,
  ),
);

interface GetAllIds extends Request.Request<ReadonlyArray<number>> {
  readonly _tag: "GetAllIds";
}
const GetAllIds = Request.tagged<GetAllIds>("GetAllIds");

class GetNameById extends Request.TaggedClass("GetNameById")<
  { readonly id: number },
  string,
  string
> {}

interface GetRequestService extends Request.Request<string> {
  readonly _tag: "GetRequestService";
}
const GetRequestService = Request.tagged<GetRequestService>("GetRequestService");

class GroupedRequest extends Request.TaggedClass("GroupedRequest")<
  { readonly group: string; readonly id: number },
  string,
  string
> {}

const processRequest = (entry: Request.Entry<GetAllIds | GetNameById>): Effect.Effect<void> => {
  switch (entry.request._tag) {
    case "GetAllIds":
      return Request.complete(entry, Exit.succeed(userIds));
    case "GetNameById": {
      const value = userNames.get(entry.request.id);
      return value
        ? Request.complete(entry, Exit.succeed(value))
        : Request.completeEffect(entry, Exit.fail("Not Found"));
    }
  }
};

const provideEnv = flow(
  Effect.provideServiceEffect(
    Counter,
    Effect.sync(() => ({ count: 0 })),
  ),
  Effect.provideServiceEffect(
    Requests,
    Effect.sync(() => ({ count: 0 })),
  ),
);

const makeUserResolver = Effect.gen(function* () {
  const counter = yield* Counter;
  const requests = yield* Requests;

  const resolver = Resolver.make<GetAllIds | GetNameById>(
    Effect.fnUntraced(function* (entries) {
      counter.count++;
      requests.count += entries.length;
      for (const entry of entries) {
        yield* delay(processRequest(entry));
      }
    }),
  ).pipe(Resolver.batchN(15));

  const getIds = Effect.request(GetAllIds(), resolver);
  const getNameById = (id: number) => Effect.request(new GetNameById({ id }), resolver);
  const getNames = getIds.pipe(
    Effect.flatMap(Effect.forEach(getNameById, { concurrency: "unbounded" })),
    Effect.onInterrupt(() =>
      Effect.tap(Interrupts, (state) => {
        state.interrupts++;
        return Effect.void;
      }),
    ),
  );

  return { getNames, getNameById } as const;
});

export const requestsDontBreakInterruptionCase = () =>
  Effect.gen(function* () {
    const { getNames } = yield* makeUserResolver;
    const fiber = yield* Effect.forkChild(getNames);
    yield* Effect.yieldNow;
    yield* Fiber.interrupt(fiber);
    const exit = yield* Fiber.await(fiber);
    if (exit._tag !== "Failure" || !Cause.hasInterruptsOnly(exit.cause)) {
      throw new Error(`request interruption contract failed: ${JSON.stringify(exit)}`);
    }
    const counter = yield* Counter;
    const interrupts = yield* Interrupts;
    if (counter.count !== 0 || interrupts.interrupts !== 1) {
      throw new Error(
        `request interruption state mismatch: ${JSON.stringify({ counter, interrupts })}`,
      );
    }
  }).pipe(provideEnv, Effect.provideService(Interrupts, { interrupts: 0 }));

export const requestDelayServicesCase = () =>
  Effect.gen(function* () {
    let delayServiceValue = "";

    const resolver = Resolver.make<GetRequestService>((entries) =>
      Effect.sync(() => {
        for (const entry of entries) {
          entry.completeUnsafe(Exit.succeed("ok"));
        }
      }),
    ).pipe(
      Resolver.setDelayEffect(
        Effect.andThen(
          Effect.yieldNow,
          Effect.gen(function* () {
            delayServiceValue = (yield* RequestService).value;
          }),
        ),
      ),
    );

    yield* Effect.request(GetRequestService(), resolver).pipe(
      Effect.provideService(RequestService, { value: "provided" }),
    );

    if (delayServiceValue !== "provided") {
      throw new Error(`request service propagation failed: ${delayServiceValue}`);
    }
  });

export const batchingPreservesRequestsCase = () =>
  Effect.gen(function* () {
    const { getNames } = yield* makeUserResolver;
    const names = yield* getNames;
    const counter = yield* Counter;
    const requests = yield* Requests;
    if (counter.count !== 3 || requests.count !== userIds.length + 1) {
      throw new Error(`request batching contract failed: ${JSON.stringify({ counter, requests })}`);
    }
    if (JSON.stringify(names) !== JSON.stringify(userIds.map((id) => userNames.get(id)))) {
      throw new Error("request names contract failed");
    }
  }).pipe(provideEnv);

export const preservesIdenticalRequestsCase = () =>
  Effect.gen(function* () {
    const { getNameById } = yield* makeUserResolver;
    yield* Effect.all([getNameById(userIds[0]), getNameById(userIds[0])], {
      concurrency: "unbounded",
      discard: true,
    });
    const requests = yield* Requests;
    const invocations = yield* Counter;
    if (requests.count !== 2 || invocations.count !== 1) {
      throw new Error(
        `request duplicate preservation failed: ${JSON.stringify({ requests, invocations })}`,
      );
    }
  }).pipe(provideEnv);

export const groupedResolverKeepsKeysSeparatedCase = () =>
  Effect.gen(function* () {
    const calls = yield* Ref.make<Array<{ readonly group: string; readonly size: number }>>([]);

    const resolver = Resolver.make<GroupedRequest>(
      Effect.fnUntraced(function* (entries) {
        const group = entries[0].request.group;
        if (!entries.every((entry) => entry.request.group === group)) {
          throw new Error(
            `grouped resolver mixed keys: ${JSON.stringify(entries.map((entry) => entry.request.group))}`,
          );
        }
        yield* Ref.update(calls, (items) => [...items, { group, size: entries.length }]);
        for (const entry of entries) {
          entry.completeUnsafe(Exit.succeed(`${group}:${entry.request.id}`));
        }
      }),
    ).pipe(
      Resolver.grouped((entry) => entry.request.group),
      Resolver.batchN(2),
    );

    const inputs = [
      { group: "alpha", id: 1 },
      { group: "alpha", id: 2 },
      { group: "alpha", id: 3 },
      { group: "beta", id: 1 },
      { group: "beta", id: 2 },
      { group: "gamma", id: 1 },
    ] as const;

    const results = yield* Effect.all(
      inputs.map((input) => Effect.request(new GroupedRequest(input), resolver)),
      { concurrency: "unbounded" },
    );

    const expected = inputs.map((input) => `${input.group}:${input.id}`);
    if (JSON.stringify(results) !== JSON.stringify(expected)) {
      throw new Error(
        `grouped resolver results mismatch: ${JSON.stringify({ expected, results })}`,
      );
    }

    const callList = yield* Ref.get(calls);
    const totals = new Map<string, number>();
    for (const call of callList) {
      if (call.size > 2) {
        throw new Error(`grouped resolver batch size exceeded: ${JSON.stringify(call)}`);
      }
      totals.set(call.group, (totals.get(call.group) ?? 0) + call.size);
    }
    for (const { group, count } of [
      { group: "alpha", count: 3 },
      { group: "beta", count: 2 },
      { group: "gamma", count: 1 },
    ]) {
      const total = totals.get(group);
      if (total !== count) {
        throw new Error(
          `grouped resolver count mismatch for ${group}: ${JSON.stringify({ total, count })}`,
        );
      }
    }
  });
