import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listQuestions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin
    .from("question_bank")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  
  return { questions: data ?? [] };
});

const UploadQuestionsInput = z.object({
  questions: z.array(z.object({
    topic: z.string(),
    question: z.string(),
    option_a: z.string(),
    option_b: z.string(),
    option_c: z.string(),
    option_d: z.string(),
    correct_answer: z.string().refine(val => ['A', 'B', 'C', 'D'].includes(val)),
  })),
});

export const uploadQuestions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UploadQuestionsInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("question_bank")
      .insert(data.questions);
    
    if (error) throw new Error(error.message);
    
    return { success: true, count: data.questions.length };
  });

const DeleteQuestionInput = z.object({
  id: z.string().uuid(),
});

export const deleteQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeleteQuestionInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("question_bank")
      .delete()
      .eq("id", data.id);
    
    if (error) throw new Error(error.message);
    
    return { success: true };
  });

export const listExams = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin
    .from("exams")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  
  return { exams: data ?? [] };
});

const CreateExamInput = z.object({
  title: z.string().min(1),
  start_time: z.string(),
  end_time: z.string(),
});

export const createExam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateExamInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("exams")
      .insert({
        title: data.title,
        start_time: data.start_time,
        end_time: data.end_time,
      });
    
    if (error) throw new Error(error.message);
    
    return { success: true };
  });

const GetExamInput = z.object({
  examId: z.string().uuid(),
});

export const getExam = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => GetExamInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: exam, error } = await supabaseAdmin
      .from("exams")
      .select("*")
      .eq("id", data.examId)
      .single();
    
    if (error) throw new Error(error.message);
    
    return { exam };
  });

export const getRandomQuestions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin
    .from("question_bank")
    .select("*");
  
  if (error) throw new Error(error.message);
  
  // Shuffle and pick 30
  const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffled.slice(0, 30);
  
  return { questions: selectedQuestions };
});

const CreateParticipantInput = z.object({
  exam_id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  question_ids: z.array(z.string().uuid()),
});

export const createParticipant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateParticipantInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: participant, error } = await supabaseAdmin
      .from("exam_participants")
      .insert(data)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    return { participant };
  });

const SubmitResponsesInput = z.object({
  participant_id: z.string().uuid(),
  responses: z.array(z.object({
    question_id: z.string().uuid(),
    selected_answer: z.string(),
  })),
  score: z.number(),
});

export const submitResponses = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitResponsesInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Insert responses
    const { error: rError } = await supabaseAdmin
      .from("exam_responses")
      .insert(data.responses.map(r => ({
        participant_id: data.participant_id,
        question_id: r.question_id,
        selected_answer: r.selected_answer,
      })));
    
    if (rError) throw new Error(rError.message);
    
    // Update participant with score and submitted time
    const { error: uError } = await supabaseAdmin
      .from("exam_participants")
      .update({
        score: data.score,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", data.participant_id);
    
    if (uError) throw new Error(uError.message);
    
    return { success: true };
  });
