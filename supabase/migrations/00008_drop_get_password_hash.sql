-- The password-unlock flow now reads the bcrypt hash via the service client
-- (server-side only), so the anon-callable get_password_hash RPC is removed —
-- the hash must never be fetchable over PostgREST by the anon role.
DROP FUNCTION IF EXISTS public.get_password_hash(TEXT);
