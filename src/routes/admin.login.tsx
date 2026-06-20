import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { hasAnyAdmin, bootstrapFirstAdmin, cleanupOrphanedAdminProfiles, verifyAdminRole } from "@/lib/admin-bootstrap.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — XPAND" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const checkHasAdmin = useServerFn(hasAnyAdmin);
  const createFirstAdmin = useServerFn(bootstrapFirstAdmin);
  const cleanupOrphaned = useServerFn(cleanupOrphanedAdminProfiles);
  const checkAdminRole = useServerFn(verifyAdminRole);

  const [mode, setMode] = useState<"login" | "bootstrap" | "loading">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // First, clean up any orphaned admin profiles
        await cleanupOrphaned();
        
        // Then check if any admin exists
        const res = await checkHasAdmin();
        if (!cancelled) {
          setMode(res.hasAdmin ? "login" : "bootstrap");
        }
      } catch (err) {
        if (!cancelled) {
          setMode("login");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [checkHasAdmin, cleanupOrphaned]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      const { isAdmin } = await checkAdminRole({ data: { userId: data.user.id } });
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account is not an admin.");
      }
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onBootstrap(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await createFirstAdmin({ data: { email: email.trim().toLowerCase(), password } });
      toast.success("Admin created — signing you in...");
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <BrandHeader subtitle="Admin Access" />
        <Card className="p-6 sm:p-8">
          {mode === "loading" && (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          )}

          {mode === "login" && (
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary">Admin Login</h1>
                <p className="text-sm text-muted-foreground">Sign in to manage participants.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}

          {mode === "bootstrap" && (
            <form onSubmit={onBootstrap} className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary">Create first admin</h1>
                <p className="text-sm text-muted-foreground">
                  No admin exists yet. Set up the first admin account now.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bemail">Email</Label>
                <Input id="bemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpass">Password</Label>
                <Input id="bpass" type="password" value={password} minLength={8}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bconf">Confirm password</Label>
                <Input id="bconf" type="password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create admin & sign in"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This option disappears once the first admin is created.
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
