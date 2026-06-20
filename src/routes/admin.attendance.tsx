import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
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
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Plus, Trash2, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { createSession } from "@/lib/admin-bootstrap.functions";

export const Route = createFileRoute("/admin/attendance")({
  head: () => ({ meta: [{ title: "Attendance — XPAND Admin" }] }),
  component: () => <AdminShell><AttendanceContent /></AdminShell>,
});

interface Session { id: string; session_name: string; session_date: string; }
interface Participant { id: string; full_name: string; email: string; }
interface Attendance { id: string; participant_id: string; session_id: string; present: boolean; }
interface Score { participant_id: string; attendance_score: number; total_score: number; exam_score: number; interview_score: number; }

function AttendanceContent() {
  const createSessionFn = useServerFn(createSession);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [newName, setNewName] = useState("Session 1");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [uploadResult, setUploadResult] = useState<{
    fileName: string; totalRows: number; matched: number;
    errors: { row: number; email: string; reason: string }[];
    sessionName: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadAll() {
    const [s, p, a, sc] = await Promise.all([
      supabase.from("sessions").select("*").order("session_date", { ascending: false }),
      supabase.from("participants").select("id, full_name, email").order("full_name"),
      supabase.from("attendance").select("*"),
      supabase.from("participant_scores").select("*"),
    ]);
    if (s.data) {
      setSessions(s.data as Session[]);
      if (s.data.length && !selectedSessionId) setSelectedSessionId(s.data[0].id);
    }
    if (p.data) setParticipants(p.data as Participant[]);
    if (a.data) setAttendance(a.data as Attendance[]);
    if (sc.data) setScores(sc.data as Score[]);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreateSession() {
    if (!newName.trim() || !newDate) { toast.error("Name and date required"); return; }
    const { session } = await createSessionFn({ data: { sessionName: newName.trim(), sessionDate: newDate } });
    setNewName("");
    toast.success("Session created");
    await loadAll();
    if (session) setSelectedSessionId(session.id);
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session and all its attendance?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Session deleted"); loadAll(); }
  }

  async function toggleAttendance(participantId: string, present: boolean) {
    if (!selectedSessionId) return;
    const existing = attendance.find(
      (a) => a.participant_id === participantId && a.session_id === selectedSessionId,
    );
    if (existing) {
      const { error } = await supabase
        .from("attendance")
        .update({ present })
        .eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase
        .from("attendance")
        .insert({ participant_id: participantId, session_id: selectedSessionId, present });
      if (error) { toast.error(error.message); return; }
    }
    await loadAll();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedSessionId) { toast.error("Select a session first"); return; }
    const session = sessions.find((s) => s.id === selectedSessionId);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const emailToId = new Map(participants.map((p) => [p.email.toLowerCase(), p.id]));
      const errors: { row: number; email: string; reason: string }[] = [];
      const matchedIds = new Set<string>();
      const seenEmails = new Set<string>();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // header row = 1
        let email = "";
        for (const v of Object.values(row)) {
          const s = String(v).trim().toLowerCase();
          if (emailRe.test(s)) { email = s; break; }
        }
        if (!email) {
          errors.push({ row: rowNum, email: "", reason: "No valid email in row" });
          return;
        }
        if (seenEmails.has(email)) {
          errors.push({ row: rowNum, email, reason: "Duplicate in file" });
          return;
        }
        seenEmails.add(email);
        const id = emailToId.get(email);
        if (!id) {
          errors.push({ row: rowNum, email, reason: "Not a registered participant" });
          return;
        }
        matchedIds.add(id);
      });

      if (matchedIds.size > 0) {
        const upRows = Array.from(matchedIds).map((pid) => ({
          participant_id: pid, session_id: selectedSessionId, present: true,
        }));
        const { error } = await supabase
          .from("attendance")
          .upsert(upRows, { onConflict: "participant_id,session_id" });
        if (error) { toast.error(error.message); return; }
      }
      setUploadResult({
        fileName: file.name,
        totalRows: rows.length,
        matched: matchedIds.size,
        errors,
        sessionName: session?.session_name ?? "Session",
      });
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function exportAttendanceCSV() {
    if (!selectedSessionId) return;
    const session = sessions.find((s) => s.id === selectedSessionId);
    const headers = ["Name", "Email", "Present"];
    const data = participants.map((p) => [
      p.full_name, p.email, sessionAttendance.get(p.id) ? "Yes" : "No",
    ]);
    const csv = [headers, ...data]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = (session?.session_name ?? "session").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.download = `attendance-${safe}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadErrorCSV() {
    if (!uploadResult || uploadResult.errors.length === 0) return;
    const headers = ["Row", "Email", "Reason"];
    const data = uploadResult.errors.map((e) => [e.row, e.email, e.reason]);
    const csv = [headers, ...data]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upload-errors-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function recomputeAll() {
    const { error } = await supabase.rpc("recompute_all_scores");
    if (error) { toast.error(error.message); return; }
    toast.success("Scores recalculated");
    await loadAll();
  }


  const sessionAttendance = useMemo(() => {
    const map = new Map<string, boolean>();
    attendance
      .filter((a) => a.session_id === selectedSessionId)
      .forEach((a) => map.set(a.participant_id, a.present));
    return map;
  }, [attendance, selectedSessionId]);

  const scoreMap = useMemo(() => new Map(scores.map((s) => [s.participant_id, s])), [scores]);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [participants, search]);

  const presentCount = useMemo(
    () => participants.filter((p) => sessionAttendance.get(p.id)).length,
    [participants, sessionAttendance],
  );

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-secondary mb-3">Create session</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Session name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Session 1" />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <Button onClick={handleCreateSession}><Plus className="h-4 w-4 mr-2" />Create</Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="space-y-2 flex-1">
            <Label>Session</Label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="sm:max-w-md"><SelectValue placeholder="Select a session" /></SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.session_name} — {new Date(s.session_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSessionId && (
            <div className="flex gap-2 flex-wrap">
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Bulk upload (.xlsx)
              </Button>
              <Button variant="outline" onClick={exportAttendanceCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button variant="outline" onClick={recomputeAll} title="Recompute attendance scores for all participants">
                Recalculate scores
              </Button>
              <Button variant="ghost" onClick={() => deleteSession(selectedSessionId)} title="Delete session">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        {selectedSessionId && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <Input placeholder="Search participants..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">{presentCount}</span> present of {participants.length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-right">Attendance Score</TableHead>
                    <TableHead className="text-right">Total Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No participants.</TableCell></TableRow>
                  ) : filteredParticipants.map((p) => {
                    const present = !!sessionAttendance.get(p.id);
                    const sc = scoreMap.get(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={present} onCheckedChange={(v) => toggleAttendance(p.id, v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{(sc?.attendance_score ?? 0).toFixed(2)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-secondary">
                          {(sc?.total_score ?? 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!selectedSessionId && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Create or select a session to mark attendance.
          </p>
        )}
      </Card>

      <Dialog open={!!uploadResult} onOpenChange={(o) => !o && setUploadResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk upload results</DialogTitle>
          </DialogHeader>
          {uploadResult && (
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{uploadResult.fileName}</span> → {uploadResult.sessionName}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border p-3 text-center">
                  <div className="text-2xl font-bold text-secondary">{uploadResult.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Rows in file</div>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-5 w-5" />{uploadResult.matched}
                  </div>
                  <div className="text-xs text-muted-foreground">Marked present</div>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <div className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
                    <AlertCircle className="h-5 w-5" />{uploadResult.errors.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Per-row errors:</div>
                  <div className="max-h-64 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadResult.errors.map((er, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{er.row}</TableCell>
                            <TableCell className="font-mono text-xs">{er.email || "—"}</TableCell>
                            <TableCell className="text-xs">{er.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {uploadResult && uploadResult.errors.length > 0 && (
              <Button variant="outline" onClick={downloadErrorCSV}>
                <Download className="h-4 w-4 mr-2" />Download error CSV
              </Button>
            )}
            <Button onClick={() => setUploadResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
