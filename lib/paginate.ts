// Supabase/PostgREST silently caps every response at its `max-rows` setting
// (default 1000) regardless of the requested limit, so list/export endpoints
// must page with .range() to return complete data.

const PAGE_SIZE = 1000;

type Page<T> = {
  data: T[] | null;
  error: { message?: string; code?: string } | null;
};

/**
 * Collects all rows by paging a query in PAGE_SIZE chunks up to `max` rows.
 * `query` must build a *fresh* builder per call (PostgREST builders are
 * single-use) and apply `.range(from, to)` to it.
 */
export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<Page<T>>,
  max = 100_000,
): Promise<{ rows: T[]; error: Page<T>["error"] }> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, max) - 1;
    const { data, error } = await query(from, to);
    if (error) return { rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { rows, error: null };
}
