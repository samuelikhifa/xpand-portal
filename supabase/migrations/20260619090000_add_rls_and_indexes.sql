-- Add RLS policy for admin_audit_log (CRITICAL SECURITY FIX)
-- Restrict audit log to service role only - no one should be able to delete/modify audit trails

ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_pkey CASCADE;

-- Ensure RLS is enabled
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Service role full access on admin_audit_log" ON public.admin_audit_log;

-- Create policy: Only service role can access audit log
CREATE POLICY "Service role full access on admin_audit_log"
  ON public.admin_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Revoke all permissions from anon and authenticated
REVOKE ALL ON TABLE public.admin_audit_log FROM anon, authenticated;

-- Grant SELECT to authenticated for read-only access (optional - remove if audit log should be completely private)
GRANT SELECT ON TABLE public.admin_audit_log TO authenticated;

-- Add policy for authenticated users to read audit log (optional - for admin dashboard)
CREATE POLICY "Authenticated can read audit log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- PERFORMANCE INDEXES

-- Index on participants.email for faster lookups during registration and verification
CREATE INDEX IF NOT EXISTS idx_participants_email ON public.participants(email);

-- Composite index on attendance for faster participant session lookups
CREATE INDEX IF NOT EXISTS idx_attendance_participant_session ON public.attendance(participant_id, session_id);

-- Index on attendance.session_id for faster session-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);

-- Index on admin_audit_log.created_at for time-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- Index on admin_audit_log.actor_id for actor-based queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_id ON public.admin_audit_log(actor_id);

-- Index on profiles.role for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Index on participants.verified for filtering verified participants
CREATE INDEX IF NOT EXISTS idx_participants_verified ON public.participants(verified);

-- Index on sessions.session_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(session_date);
