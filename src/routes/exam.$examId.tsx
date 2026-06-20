import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Clock, AlertCircle } from "lucide-react";
import { getRandomQuestions } from "@/lib/exams.functions";

export const Route = createFileRoute("/exam/$examId")({
  component: ExamPage,
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
}

interface Exam {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

function ExamPage() {
  const { examId } = Route.useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExam() {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (error) {
        setError("Exam not found");
      } else {
        const now = new Date();
        const start = new Date(data.start_time);
        const end = new Date(data.end_time);

        if (now < start) {
          setError("This exam has not started yet");
        } else if (now > end) {
          setError("This exam has ended");
        } else {
          setExam(data);
        }
      }
      setLoading(false);
    }
    loadExam();
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Exam Not Available</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return <ExamInterface exam={exam!} />;
}

function ExamInterface({ exam }: { exam: Exam }) {
  const [step, setStep] = useState<"register" | "exam" | "result">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [registering, setRegistering] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const getRandomQuestionsFn = useServerFn(getRandomQuestions);

  async function register() {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setRegistering(true);

    // Get 30 random questions from server
    const result = await getRandomQuestionsFn();
    if (!result.questions || result.questions.length === 0) {
      toast.error("Failed to load questions");
      setRegistering(false);
      return;
    }

    const selectedQuestions = result.questions;

    // Create participant
    const { data: participant, error: pError } = await supabase
      .from("exam_participants")
      .insert({
        exam_id: exam.id,
        full_name: fullName.trim(),
        email: email.trim(),
        question_ids: selectedQuestions.map((q: Question) => q.id),
      })
      .select()
      .single();

    if (pError) {
      toast.error(pError.message);
      setRegistering(false);
      return;
    }

    setQuestions(selectedQuestions);
    setParticipantId(participant.id);
    setStep("exam");
    setRegistering(false);
  }

  useEffect(() => {
    if (step === "exam" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  async function submitExam() {
    if (submitting) return;
    setSubmitting(true);

    // Save responses
    const responses = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
      participant_id: participantId!,
      question_id: questionId,
      selected_answer: selectedAnswer,
    }));

    const { error: rError } = await supabase
      .from("exam_responses")
      .insert(responses);

    if (rError) {
      toast.error(rError.message);
      setSubmitting(false);
      return;
    }

    // Calculate score
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    const finalScore = (correctCount / 30) * 45; // Score out of 45%

    // Update participant with score and submitted time
    const { error: uError } = await supabase
      .from("exam_participants")
      .update({
        score: finalScore,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", participantId!);

    if (uError) {
      toast.error(uError.message);
    } else {
      setScore(finalScore);
      setStep("result");
    }

    setSubmitting(false);
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  if (step === "register") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2">{exam.title}</h1>
          <p className="text-muted-foreground mb-6">Enter your details to begin the exam</p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>30 questions • 10 minutes</span>
              </div>
              <div className="text-muted-foreground">
                Once you start, the timer cannot be paused. Make sure you're ready before beginning.
              </div>
            </div>
            <Button onClick={register} disabled={registering} className="w-full">
              {registering ? "Starting..." : "Start Exam"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "exam") {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold">{exam.title}</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {answeredCount}/30 answered
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                timeLeft < 60 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              }`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {questions.map((q, index) => (
              <Card key={q.id} className="p-6">
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground">Question {index + 1}</span>
                  <h3 className="text-lg font-medium mt-1">{q.question}</h3>
                </div>
                <RadioGroup
                  value={answers[q.id] || ""}
                  onValueChange={(value) => setAnswers({ ...answers, [q.id]: value })}
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                      <RadioGroupItem value="A" id={`q${q.id}-a`} />
                      <Label htmlFor={`q${q.id}-a`} className="flex-1 cursor-pointer">
                        A. {q.option_a}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                      <RadioGroupItem value="B" id={`q${q.id}-b`} />
                      <Label htmlFor={`q${q.id}-b`} className="flex-1 cursor-pointer">
                        B. {q.option_b}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                      <RadioGroupItem value="C" id={`q${q.id}-c`} />
                      <Label htmlFor={`q${q.id}-c`} className="flex-1 cursor-pointer">
                        C. {q.option_c}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                      <RadioGroupItem value="D" id={`q${q.id}-d`} />
                      <Label htmlFor={`q${q.id}-d`} className="flex-1 cursor-pointer">
                        D. {q.option_d}
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={submitExam}
              disabled={submitting || answeredCount < 30}
              size="lg"
              className="min-w-[200px]"
            >
              {submitting ? "Submitting..." : answeredCount < 30 ? `Answer all 30 questions (${30 - answeredCount} remaining)` : "Submit Exam"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Exam Submitted</h1>
          <p className="text-muted-foreground mb-6">Thank you for completing the exam</p>
          
          <div className="bg-primary/10 rounded-lg p-6 mb-6">
            <div className="text-5xl font-bold text-primary mb-2">{score?.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Your Score</div>
          </div>

          <p className="text-sm text-muted-foreground">
            Your results have been recorded. You can close this page.
          </p>
        </Card>
      </div>
    );
  }

  return null;
}
