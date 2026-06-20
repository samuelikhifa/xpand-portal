import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { listAdmins, inviteAdmin, revokeAdmin } from "@/lib/admin-team.functions";

export const Route = createFileRoute("/admin/team")({
  head: () => ({ meta: [{ title: "Admin Team — XPAND" }] }),
  component: () => <AdminShell><TeamContent /></AdminShell>,
});

interface AdminRow { id: string; email: string; created_at: string }

function TeamContent() {
  const list = useServerFn(listAdmins);
  const invite = useServerFn(inviteAdmin);
  const revoke = useServerFn(revokeAdmin);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await list();
      setAdmins(res.admins as AdminRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  useEffect(() => { load(); }, []);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Enter email"); return;
    }
    setBusy(true);
    try {
      const res = await invite({ data: { email } });
      toast.success(res.message || "Invite sent successfully");
      setEmail("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  async function onRevoke(id: string, em: string) {
    if (!confirm(`Revoke admin access for ${em}?`)) return;
    try {
      await revoke({ data: { user_id: id } });
      toast.success("Revoked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-secondary mb-3">Invite admin</h2>
        <form onSubmit={onInvite} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Inviting..." : "Send invite"}</Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          An invite email will be sent to the new admin. They'll set their password when they accept the invite.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-secondary mb-3">Current admins</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No admins.</TableCell></TableRow>
            ) : admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.email}</TableCell>
                <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onRevoke(a.id, a.email)}>Revoke</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
