// Mutable holder the mocked `withAuth` reads to inject a per-test auth context,
// plus the service-client mock used by routes that bypass RLS (e.g. account).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authState: { current: any; serviceDb: any } = { current: null, serviceDb: null };
