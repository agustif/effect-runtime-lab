import { DurableObject } from "cloudflare:workers";
interface Env {
    readonly SQLITE_DB: DurableObjectNamespace<SqliteCounterObject>;
}
export declare class SqliteCounterObject extends DurableObject<Env> {
    fetch(): Promise<Response>;
}
declare const _default: {
    fetch(): Response;
};
export default _default;
//# sourceMappingURL=worker.d.ts.map