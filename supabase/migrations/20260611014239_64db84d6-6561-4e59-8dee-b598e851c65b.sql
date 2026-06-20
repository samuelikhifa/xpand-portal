
-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL,
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sessions TO anon, authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sessions" ON public.sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sessions insert" ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sessions update" ON public.sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sessions delete" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own attendance" ON public.attendance FOR SELECT TO authenticated USING (
  participant_id IN (SELECT id FROM public.participants WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Participant scores (total_score generated)
CREATE TABLE public.participant_scores (
  participant_id UUID PRIMARY KEY REFERENCES public.participants(id) ON DELETE CASCADE,
  attendance_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  exam_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  interview_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_score DOUBLE PRECISION GENERATED ALWAYS AS (attendance_score * 0.25 + exam_score * 0.45 + interview_score * 0.30) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.participant_scores TO authenticated;
GRANT ALL ON public.participant_scores TO service_role;
ALTER TABLE public.participant_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scores" ON public.participant_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own scores" ON public.participant_scores FOR SELECT TO authenticated USING (
  participant_id IN (SELECT id FROM public.participants WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Recompute attendance score for one participant
CREATE OR REPLACE FUNCTION public.recompute_attendance_score(_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sessions_attended INT;
  score DOUBLE PRECISION;
BEGIN
  SELECT COUNT(*) INTO sessions_attended
  FROM public.attendance
  WHERE participant_id = _participant_id AND present = true;

  score := LEAST(sessions_attended, 16) * 6.25;

  INSERT INTO public.participant_scores (participant_id, attendance_score, updated_at)
  VALUES (_participant_id, score, now())
  ON CONFLICT (participant_id) DO UPDATE
  SET attendance_score = EXCLUDED.attendance_score,
      updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.recompute_attendance_score(uuid) FROM PUBLIC, anon, authenticated;

-- Trigger on attendance changes
CREATE OR REPLACE FUNCTION public.attendance_score_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_attendance_score(OLD.participant_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_attendance_score(NEW.participant_id);
    RETURN NEW;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.attendance_score_trigger() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER attendance_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.attendance_score_trigger();

-- Auto-create score row when a participant is added
CREATE OR REPLACE FUNCTION public.handle_new_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.participant_scores (participant_id) VALUES (NEW.id)
  ON CONFLICT (participant_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_participant() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_participant_created
AFTER INSERT ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.handle_new_participant();

-- Backfill scores for existing participants
INSERT INTO public.participant_scores (participant_id)
SELECT id FROM public.participants
ON CONFLICT (participant_id) DO NOTHING;

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
