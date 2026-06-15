import { vi } from "vitest";

export type DbResult = { data?: unknown; error?: unknown; count?: number };
type Call = { table?: string; method: string; args: unknown[] };

/**
 * Chainable Supabase-client mock. Queue the results each terminal operation
 * (await, .single(), .maybeSingle(), .rpc(), auth.admin.*) should resolve to,
 * in call order. Every other builder method (from/select/insert/eq/in/…) is a
 * no-op that returns the builder, and its arguments are recorded in `calls`.
 */
export function createDbMock(results: DbResult[] = []) {
  const queue = [...results];
  const calls: Call[] = [];
  const pop = (): DbResult => (queue.length ? queue.shift()! : { data: null, error: null });

  function makeBuilder(table?: string): unknown {
    const builder: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          return (resolve: (v: DbResult) => unknown) => resolve(pop());
        }
        if (prop === "single" || prop === "maybeSingle") {
          return () => {
            calls.push({ table, method: prop as string, args: [] });
            return Promise.resolve(pop());
          };
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: prop as string, args });
          return builder;
        };
      },
    });
    return builder;
  }

  const db = {
    from: (table: string) => {
      calls.push({ table, method: "from", args: [] });
      return makeBuilder(table);
    },
    rpc: (...args: unknown[]) => {
      calls.push({ method: "rpc", args });
      return makeBuilder();
    },
    auth: {
      admin: {
        deleteUser: vi.fn(async (...args: unknown[]) => {
          calls.push({ method: "deleteUser", args });
          return pop();
        }),
      },
    },
  };

  return { db, calls, queue };
}
