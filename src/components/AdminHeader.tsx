import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
// import xpandLogo from "@/assets/jci-uniben-logo.png";
import { LogOut } from "lucide-react";

const tabs = [
  { to: "/admin/dashboard", label: "Participants" },
  { to: "/admin/attendance", label: "Attendance" },
  { to: "/admin/scores", label: "Scores" },
  { to: "/admin/exams", label: "Exams" },
  { to: "/admin/announcements", label: "Announcements" },
  { to: "/admin/team", label: "Team" },
  { to: "/admin/audit", label: "Audit" },
] as const;

export function AdminHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* <div className="flex items-center gap-3">
          <img src={xpandLogo} alt="XPAND" className="h-8 w-auto" />
        </div> */}
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary hover:bg-accent"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
