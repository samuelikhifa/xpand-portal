import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Download, Save } from "lucide-react";

export const Route = createFileRoute("/admin/scores")({
  head: () => ({ meta: [{ title: "Scores — XPAND Admin" }] }),
  component: () => <AdminShell><ScoresContent /></AdminShell>,
});

interface Participant { id: string; full_name: string; email: string; }
interface Score {
  participant_id: string;
  attendance_score: number;
  exam_score: number;
  interview_score: number;
  total_score: number | null;
}

interface Row extends Participant {
  attendance_score: number;
  exam_score: number;
  interview_score: number;
  total_score: number;
  dirty: boolean;
}

function ScoresContent() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      supabase.from("participants").select("id, full_name, email").order("full_name"),
      supabase.from("participant_scores").select("*"),
    ]);
    if (pRes.error) toast.error(pRes.error.message);
    if (sRes.error) toast.error(sRes.error.message);
    const scoreMap = new Map<string, Score>((sRes.data as Score[] ?? []).map((s) => [s.participant_id, s]));
    const list: Row[] = ((pRes.data as Participant[]) ?? []).map((p) => {
      const s = scoreMap.get(p.id);
      return {
        ...p,
        attendance_score: s?.attendance_score ?? 0,
        exam_score: s?.exam_score ?? 0,
        interview_score: s?.interview_score ?? 0,
        total_score: s?.total_score ?? 0,
        dirty: false,
      };
    });
    setRows(list);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, search]);

  function updateField(id: string, field: "exam_score" | "interview_score", value: number) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, [field]: value, dirty: true };
      next.total_score = next.attendance_score * 0.25 + next.exam_score * 0.45 + next.interview_score * 0.30;
      return next;
    }));
  }

  async function saveRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const exam = clamp(row.exam_score);
    const interview = clamp(row.interview_score);
    if (exam !== row.exam_score || interview !== row.interview_score) {
      toast.error("Scores must be between 0 and 100");
      return;
    }
    setSavingId(id);
    const { error } = await supabase
      .from("participant_scores")
      .upsert(
        { participant_id: id, exam_score: exam, interview_score: interview },
        { onConflict: "participant_id" },
      );
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, dirty: false } : r));
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Attendance %", "Exam", "Interview", "Total"];
    const data = filtered.map((r) => [
      r.full_name, r.email,
      r.attendance_score.toFixed(2),
      r.exam_score.toFixed(2),
      r.interview_score.toFixed(2),
      r.total_score.toFixed(2),
    ]);
    downloadCSV("xpand-scores", [headers, ...data]);
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center sm:justify-between">
          <Input placeholder="Search participants..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
          <Button onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          Total = Attendance × 25% + Exam × 45% + Interview × 30%
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Attendance %</TableHead>
                <TableHead className="w-28">Exam</TableHead>
                <TableHead className="w-28">Interview</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No participants.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{r.attendance_score.toFixed(2)}%</Badge>
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} max={100} step="0.01" value={r.exam_score}
                      onChange={(e) => updateField(r.id, "exam_score", Number(e.target.value))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} max={100} step="0.01" value={r.interview_score}
                      onChange={(e) => updateField(r.id, "interview_score", Number(e.target.value))} />
                  </TableCell>
                  <TableCell className="text-right font-semibold text-secondary">
                    {r.total_score.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={r.dirty ? "default" : "outline"}
                      disabled={!r.dirty || savingId === r.id}
                      onClick={() => saveRow(r.id)}>
                      <Save className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{savingId === r.id ? "..." : "Save"}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function clamp(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
