
-- 1) Tighten participants INSERT: registration goes through service-role server fn, so drop public INSERT policy
DROP POLICY IF EXISTS "Anyone can register" ON public.participants;

-- 2) Defense in depth: prevent non-admins from forcing verified=true on UPDATE
CREATE OR REPLACE FUNCTION public.participants_guard_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.verified := COALESCE(OLD.verified, false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS participants_guard_verified_upd ON public.participants;
CREATE TRIGGER participants_guard_verified_upd
BEFORE UPDATE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.participants_guard_verified();

-- 3) Lock down SECURITY DEFINER functions exposed via PostgREST.
-- Trigger functions never need EXECUTE for anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_participant() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_participant_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.attendance_score_trigger() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_attendance_score(uuid) FROM anon, authenticated, PUBLIC;
-- recompute_all_scores already guards admin internally; restrict to authenticated only (admins).
REVOKE EXECUTE ON FUNCTION public.recompute_all_scores() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.participants_guard_verified() FROM anon, authenticated, PUBLIC;
-- has_role is invoked by RLS; PostgREST exposure not desired but harmless. Restrict from anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
