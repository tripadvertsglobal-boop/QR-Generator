// Build a Request for a route handler. Body is JSON-encoded when provided.
export function jsonRequest(method: string, body?: unknown, url = "http://test.local/api/v1") {
  return new Request(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Context object for route handlers; params is a Promise in Next 16. Generic so
// it satisfies a route's specific `{ params: Promise<{ id: string }> }` type, and
// defaults to {} for non-dynamic routes (which ignore the context).
export function ctx<T extends Record<string, string>>(params: T = {} as T) {
  return { params: Promise.resolve(params) };
}
