import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "./AdminHeader";
import { verifyAdminRole } from "@/lib/admin-bootstrap.functions";

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const checkAdminRole = useServerFn(verifyAdminRole);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Wait for session to load
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate({ to: "/admin/login" });
          return;
        }

        // Check admin role using server function (bypasses RLS)
        const { isAdmin } = await checkAdminRole({ data: { userId: session.user.id } });
        if (!isAdmin) {
          // Only sign out if user is confirmed logged in but not admin
          await supabase.auth.signOut();
          navigate({ to: "/admin/login" });
          return;
        }

        if (!cancelled) setChecking(false);
      } catch (err) {
        console.error("Admin auth check failed:", err);
        navigate({ to: "/admin/login" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, checkAdminRole]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
