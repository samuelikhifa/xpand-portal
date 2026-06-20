import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log — XPAND" }] }),
  component: () => <AdminShell><AuditContent /></AdminShell>,
});

interface AuditRow {
  id: string; actor_email: string | null; action: string;
  entity_type: string; entity_id: string | null;
  details: Record<string, unknown> | null; created_at: string;
}

function AuditContent() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Get total count
      const { count: total, error: countError } = await supabase
        .from("admin_audit_log")
        .select("*", { count: "exact", head: true });
      if (countError) toast.error(countError.message);
      else setTotalCount(total ?? 0);

      // Get paginated data
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) toast.error(error.message);
      else setRows((data as AuditRow[]) ?? []);
      setLoading(false);
    })();
  }, [page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-secondary mb-3">Audit log</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Loading...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No activity yet.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.actor_email ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                <TableCell className="text-xs">{r.entity_type}</TableCell>
                <TableCell className="text-xs font-mono max-w-md truncate" title={JSON.stringify(r.details)}>
                  {r.details ? JSON.stringify(r.details) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
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
  );
}
