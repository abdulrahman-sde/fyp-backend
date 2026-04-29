import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const interviewEvaluationSchema = z.object({
  overall_score: z.number().min(0).max(100),
  pass_fail: z.boolean(),
  ai_recommendation: z.string(),
  strengths: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).min(0).max(5),
  per_question: z.array(
    z.object({
      sequence: z.number().int(),
      score: z.number().min(0).max(10),
      rationale: z.string(),
    })
  ),
  communication_score: z.number().min(0).max(10),
  technical_score: z.number().min(0).max(10),
  cultural_fit_score: z.number().min(0).max(10),
  summary: z.string(),
});

export type InterviewEvaluationResult = z.infer<typeof interviewEvaluationSchema>;

export interface EvaluateInterviewInput {
  job_title: string;
  job_description: string;
  job_requirements: string;
  candidate_name: string;
  resume_text: string;
  transcript: Array<{ sequence: number; question_text: string; transcript: string }>;
}

function formatTranscript(rows: EvaluateInterviewInput["transcript"]): string {
  return rows
    .map(
      (r) =>
        `Q${r.sequence}: ${r.question_text}\nCandidate: ${r.transcript || "(no answer)"}`
    )
    .join("\n\n");
}

export async function evaluateInterview(
  input: EvaluateInterviewInput
): Promise<InterviewEvaluationResult> {
  const transcriptText = formatTranscript(input.transcript);

  const { output } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    output: Output.object({ schema: interviewEvaluationSchema }),
    prompt: `You are a senior technical recruiter scoring a completed voice interview. Evaluate the candidate's responses against the job requirements honestly and specifically.

JOB TITLE: ${input.job_title}

JOB DESCRIPTION:
${input.job_description.slice(0, 2500)}

JOB REQUIREMENTS:
${input.job_requirements.slice(0, 1500)}

CANDIDATE: ${input.candidate_name}

RESUME (for context):
${input.resume_text.slice(0, 3000)}

INTERVIEW TRANSCRIPT:
${transcriptText.slice(0, 8000)}

## Scoring rubric

### PER-QUESTION SCORE (0–10)
For each question in the transcript, score the candidate's answer:
- 9–10: Excellent — specific, evidenced, directly addresses the question with depth
- 7–8: Strong — clear and relevant, minor gaps
- 5–6: Average — answers the question but lacks depth or specificity
- 3–4: Weak — vague, partially off-topic, or missing key elements
- 0–2: Poor — non-answer, deflection, or fundamentally wrong
Provide a one-sentence rationale citing what the candidate did or did not say.

### COMMUNICATION SCORE (0–10)
Clarity, structure, conciseness. Penalize rambling, filler, or incoherence.

### TECHNICAL SCORE (0–10)
Depth and accuracy of technical claims relative to the role. If the role is non-technical, score on domain knowledge.

### CULTURAL FIT SCORE (0–10)
Alignment with the role's collaboration, ownership, and growth signals based on what they describe.

### OVERALL SCORE (0–100)
Weighted composite: technical 40%, communication 25%, cultural fit 15%, average per-question score (scaled to 0–100) 20%. Apply downward adjustment for non-answers or contradictions with resume.

### PASS/FAIL
true if overall_score >= 65 AND no question scored below 3. Otherwise false.

### STRENGTHS (1–5)
Specific moments from the transcript where the candidate demonstrated value. Each must reference something they actually said.

### WEAKNESSES (0–5)
Specific gaps revealed in the conversation. Empty array if none material. Do not manufacture concerns.

### AI_RECOMMENDATION (1–3 sentences)
A hiring-manager briefing: should they advance? What is the strongest signal and the key risk?

### SUMMARY (2–4 sentences)
Overall narrative of how the interview went, anchored to specific exchanges.

Be honest. Do not inflate scores. If the transcript is empty or the candidate did not engage, score accordingly and recommend no advance.`,
  });

  if (!output) {
    throw new Error("Failed to generate interview evaluation - no output returned");
  }

  return output;
}
