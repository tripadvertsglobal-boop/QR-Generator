// Route params are UUID-shape-checked before they reach PostgREST (lib/validation
// isUuid), so fixtures must be real UUIDs or handlers 404 before any DB call.
export const RES_ID = "11111111-1111-4111-8111-111111111111";
export const MISSING_ID = "22222222-2222-4222-8222-222222222222";
export const NOT_A_UUID = "abc";
