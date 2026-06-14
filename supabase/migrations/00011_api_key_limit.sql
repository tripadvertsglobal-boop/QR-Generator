-- Cap active API keys at 4 per account. Enforced in the route handler too; this
-- trigger is the race-proof backstop (a concurrent double-create can't exceed 4).

CREATE OR REPLACE FUNCTION public.enforce_api_key_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.api_keys
    WHERE user_id = NEW.user_id AND is_active
  ) >= 4 THEN
    RAISE EXCEPTION 'API key limit reached (max 4 active keys per account)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_api_key_limit
  BEFORE INSERT ON public.api_keys
  FOR EACH ROW
  WHEN (NEW.is_active)
  EXECUTE FUNCTION public.enforce_api_key_limit();
