
-- Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit" ON public.admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Audit trigger for participants UPDATE
CREATE OR REPLACE FUNCTION public.log_participant_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  changes jsonb := '{}'::jsonb;
  email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    changes := changes || jsonb_build_object('full_name', jsonb_build_object('old', OLD.full_name, 'new', NEW.full_name));
  END IF;
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    changes := changes || jsonb_build_object('phone', jsonb_build_object('old', OLD.phone, 'new', NEW.phone));
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    changes := changes || jsonb_build_object('verified', jsonb_build_object('old', OLD.verified, 'new', NEW.verified));
  END IF;
  IF changes = '{}'::jsonb THEN RETURN NEW; END IF;
  SELECT u.email INTO email FROM auth.users u WHERE u.id = auth.uid();
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), email, 'update', 'participant', NEW.id,
    jsonb_build_object('participant_email', NEW.email, 'changes', changes));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_participant_change ON public.participants;
CREATE TRIGGER trg_log_participant_change
AFTER UPDATE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.log_participant_change();

-- Recompute all scores
CREATE OR REPLACE FUNCTION public.recompute_all_scores()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  FOR r IN SELECT id FROM public.participants LOOP
    PERFORM public.recompute_attendance_score(r.id);
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recompute_all_scores() TO authenticated;
