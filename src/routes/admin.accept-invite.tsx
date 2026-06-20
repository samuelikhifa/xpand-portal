import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/accept-invite")({
  head: () => ({ meta: [{ title: "Accept Admin Invite — XPAND" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your invite...");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        // Wait for Supabase to process the invite token
        let accessToken: string | undefined;
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          accessToken = data.session?.access_token;
          if (accessToken) break;
          await new Promise((r) => setTimeout(r, 150));
        }
        
        if (!accessToken) {
          throw new Error("Invalid or expired invite link. Please request a new invite.");
        }

        if (!cancelled) {
          setStatus("success");
          setMessage("You've been invited to join the admin team. Please set your password to continue.");
          setShowPasswordForm(true);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Failed to process invite");
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setPasswordAndComplete(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password,
      });
      
      if (updateError) throw updateError;
      if (!user) throw new Error("Failed to update password");

      // Set the user's profile role to admin
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: user.id, role: "admin" }, { onConflict: "id" });
      
      if (profileError) throw profileError;

      setStatus("success");
      setMessage("Password set successfully! Redirecting to admin dashboard...");
      setShowPasswordForm(false);
      
      setTimeout(() => {
        navigate({ to: "/admin/dashboard" });
      }, 1500);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <BrandHeader subtitle="Admin Access" />
        <Card className="p-6 sm:p-8 text-center space-y-3">
          {status === "loading" && (
            <h1 className="text-xl font-semibold text-secondary">Processing invite...</h1>
          )}
          
          {status === "error" && (
            <>
              <h1 className="text-xl font-semibold text-destructive">Invite Failed</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/admin/login" })}
              >
                Go to login
              </Button>
            </>
          )}
          
          {status === "success" && !showPasswordForm && (
            <>
              <h1 className="text-2xl font-bold text-primary">Welcome to the team! 🎉</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}
          
          {showPasswordForm && (
            <form onSubmit={setPasswordAndComplete} className="space-y-4 text-left">
              <div>
                <h1 className="text-2xl font-bold text-secondary">Set your password</h1>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Setting password..." : "Set password & continue"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
