-- Fix: Grant EXECUTE permission on handle_new_participant trigger function
-- This allows the trigger to fire when anonymous users register
GRANT EXECUTE ON FUNCTION public.handle_new_participant() TO anon, authenticated;
