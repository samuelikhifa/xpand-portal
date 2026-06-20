
-- Drop overly-permissive update policy
DROP POLICY IF EXISTS "Anyone can mark verified by email" ON public.participants;

-- Auth users can update their own participant row (matched by email)
CREATE POLICY "Users can update own participant by email"
  ON public.participants FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Revoke anon update grant; only authenticated can update their own row
REVOKE UPDATE ON public.participants FROM anon;

-- Lock down security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
