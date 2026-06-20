import { createMiddleware } from "@tanstack/react-start";

export const safeAttachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      return next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      return next({ headers: {} });
    }
  },
);