CREATE OR REPLACE FUNCTION public.participants_guard_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.verified := COALESCE(OLD.verified, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS participants_guard_verified_upd ON public.participants;
CREATE TRIGGER participants_guard_verified_upd
BEFORE UPDATE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.participants_guard_verified();

REVOKE EXECUTE ON FUNCTION public.participants_guard_verified() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.participants_guard_verified() TO service_role;