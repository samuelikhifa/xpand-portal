import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — XPAND" }] }),
  component: () => (
    <AdminShell>
      <DashboardContent />
    </AdminShell>
  ),
});

interface Participant {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  verified: boolean;
  created_at: string;
}

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Participant | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  async function load() {
    setLoading(true);
    // Get total count for pagination
    const { count: total, error: countError } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true });
    if (countError) toast.error(countError.message);
    else setTotalCount(total ?? 0);

    // Get paginated data
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) toast.error(error.message);
    else setParticipants((data as Participant[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [participants, query]);

  const totalRegistered = totalCount;
  const totalVerified = participants.filter((p) => p.verified).length;
  const totalPages = Math.ceil(totalCount / pageSize);

  function exportCSV() {
    const headers = ["Name", "Email", "Phone", "Verified", "Registered"];
    const rows = filtered.map((p) => [
      p.full_name, p.email, p.phone ?? "",
      p.verified ? "Yes" : "No",
      new Date(p.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xpand-participants-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Total registered</div>
          <div className="text-3xl font-bold text-secondary mt-1">{totalRegistered}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Total verified</div>
          <div className="text-3xl font-bold text-primary mt-1">{totalVerified}</div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No participants yet.</TableCell></TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.phone ?? "—"}</TableCell>
                    <TableCell>
                      {p.verified
                        ? <Badge className="bg-primary text-primary-foreground">Verified</Badge>
                        : <Badge variant="outline">Pending</Badge>}
                    </TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} participants
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {editing && (
        <EditDialog
          participant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditDialog({
  participant, onClose, onSaved,
}: { participant: Participant; onClose: () => void; onSaved: () => void }) {
  const [full_name, setFullName] = useState(participant.full_name);
  const [phone, setPhone] = useState(participant.phone ?? "");
  const [verified, setVerified] = useState(participant.verified);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("participants")
      .update({ full_name, phone, verified })
      .eq("id", participant.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); onSaved(); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit participant</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={full_name} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email (read-only)</Label>
            <Input value={participant.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            Verified
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
