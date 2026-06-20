import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Trash2, Copy, Clock, Users } from "lucide-react";
import * as XLSX from "xlsx";
import {
  listQuestions,
  uploadQuestions,
  deleteQuestion,
  listExams,
  createExam,
} from "@/lib/exams.functions";

export const Route = createFileRoute("/admin/exams")({
  head: () => ({ meta: [{ title: "Exams — XPAND" }] }),
  component: () => (
    <AdminShell>
      <ExamsContent />
    </AdminShell>
  ),
});

interface Question {
  id: string;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  created_at: string;
}

interface Exam {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

function ExamsContent() {
  const [activeTab, setActiveTab] = useState("questions");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Exams</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="questions">Question Bank</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Exam</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">
          <QuestionBank />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleExam />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const listQuestionsFn = useServerFn(listQuestions);
  const uploadQuestionsFn = useServerFn(uploadQuestions);
  const deleteQuestionFn = useServerFn(deleteQuestion);

  async function loadQuestions() {
    setLoading(true);
    try {
      const result = await listQuestionsFn();
      setQuestions(result.questions ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load questions");
    }
    setLoading(false);
  }

  useEffect(() => { loadQuestions(); }, []);

  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.topic]) acc[q.topic] = [];
    acc[q.topic].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      const questionsToInsert = jsonData.map((row) => ({
        topic: row.topic || row.Topic || "",
        question: row.question || row.Question || "",
        option_a: row.option_a || row.Option_A || row.optionA || "",
        option_b: row.option_b || row.Option_B || row.optionB || "",
        option_c: row.option_c || row.Option_C || row.optionC || "",
        option_d: row.option_d || row.Option_D || row.optionD || "",
        correct_answer: (row.correct_answer || row.Correct_Answer || row.correctAnswer || "").toUpperCase().charAt(0),
      })).filter((q) => q.question && q.correct_answer && ['A', 'B', 'C', 'D'].includes(q.correct_answer));

      if (questionsToInsert.length === 0) {
        toast.error("No valid questions found in file");
        setUploading(false);
        return;
      }

      const result = await uploadQuestionsFn({ data: { questions: questionsToInsert } });
      toast.success(`Uploaded ${result.count} questions`);
      loadQuestions();
    } catch (err) {
      toast.error("Failed to parse Excel file");
      console.error(err);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function deleteQuestion(id: string) {
    setDeleting(id);
    try {
      await deleteQuestionFn({ data: { id } });
      toast.success("Question deleted");
      loadQuestions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete question");
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="xlsx-upload">Upload Questions (.xlsx)</Label>
            <Input
              id="xlsx-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Columns: topic, question, option_a, option_b, option_c, option_d, correct_answer (A/B/C/D)
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {questions.length} questions
          </Badge>
        </div>
      </Card>

      {loading ? (
        <Card className="p-6 text-center text-muted-foreground">Loading questions...</Card>
      ) : Object.keys(groupedQuestions).length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No questions uploaded yet</Card>
      ) : (
        Object.entries(groupedQuestions).map(([topic, topicQuestions]) => (
          <Card key={topic} className="p-6">
            <h3 className="text-xl font-semibold mb-4">{topic}</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicQuestions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="max-w-md truncate">{q.question}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        A: {q.option_a.substring(0, 20)}...<br />
                        B: {q.option_b.substring(0, 20)}...<br />
                        C: {q.option_c.substring(0, 20)}...<br />
                        D: {q.option_d.substring(0, 20)}...
                      </TableCell>
                      <TableCell>
                        <Badge>{q.correct_answer}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuestion(q.id)}
                          disabled={deleting === q.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ScheduleExam() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const listExamsFn = useServerFn(listExams);
  const createExamFn = useServerFn(createExam);

  async function loadExams() {
    setLoading(true);
    try {
      const result = await listExamsFn();
      setExams(result.exams ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load exams");
    }
    setLoading(false);
  }

  useEffect(() => { loadExams(); }, []);

  async function createExam() {
    if (!title || !startTime || !endTime) {
      toast.error("Please fill all fields");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (diffHours > 3) {
      toast.error("Exam window cannot exceed 3 hours");
      return;
    }

    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }

    setCreating(true);
    try {
      await createExamFn({ data: { title, start_time: startTime, end_time: endTime } });
      toast.success("Exam created");
      setShowCreateDialog(false);
      setTitle("");
      setStartTime("");
      setEndTime("");
      loadExams();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create exam");
    }
    setCreating(false);
  }

  function copyExamLink(examId: string) {
    const url = `${window.location.origin}/exam/${examId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  function getExamStatus(exam: Exam) {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (now < start) return { label: "Upcoming", variant: "secondary" as const };
    if (now > end) return { label: "Ended", variant: "outline" as const };
    return { label: "Active", variant: "default" as const };
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Scheduled Exams</h2>
            <p className="text-sm text-muted-foreground">Create and manage exam schedules</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Schedule Exam
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-6 text-center text-muted-foreground">Loading exams...</Card>
      ) : exams.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No exams scheduled yet</Card>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const status = getExamStatus(exam);
            return (
              <Card key={exam.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{exam.title}</h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(exam.start_time).toLocaleString()} - {new Date(exam.end_time).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyExamLink(exam.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., JavaScript Assessment" />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time (max 3 hours after start)</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={createExam} disabled={creating}>{creating ? "Creating..." : "Create Exam"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
