import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Megaphone } from "lucide-react";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — XPAND Admin" }] }),
  component: () => <AdminShell><AnnouncementsContent /></AdminShell>,
});

interface Announcement { id: string; title: string; body: string; created_at: string; }

function AnnouncementsContent() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data as Announcement[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function post() {
    if (!title.trim() || !body.trim()) { toast.error("Title and body required"); return; }
    setSaving(true);
    const { error } = await supabase.from("announcements").insert({ title: title.trim(), body: body.trim() });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Announcement posted"); setTitle(""); setBody(""); load(); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold text-secondary flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Post announcement
        </h2>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Training schedule update" />
        </div>
        <div className="space-y-2">
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </div>
        <Button onClick={post} disabled={saving}>{saving ? "Posting..." : "Post"}</Button>
      </Card>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No announcements yet.</p>
        ) : items.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-secondary">{a.title}</h3>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                <p className="text-sm mt-2 whitespace-pre-wrap">{a.body}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
