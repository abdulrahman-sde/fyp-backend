import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const resumeAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  recommendation: z.enum(["STRONG_HIRE", "HIRE", "MAYBE", "NO_HIRE"]),
  summary: z.string(),
  skills_match: z.number().int().min(0).max(100),
  experience_match: z.number().int().min(0).max(100),
  education_match: z.number().int().min(0).max(100),
  matched_keywords: z.array(z.string()),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
});

export type ResumeAnalysisResult = z.infer<typeof resumeAnalysisSchema>;

export async function analyzeResume(
  resumeText: string,
  jobTitle: string,
  jobDescription: string
): Promise<ResumeAnalysisResult> {
  const { output } = await generateText({
    model: openai("gpt-4o-mini"),
    output: Output.object({
      schema: resumeAnalysisSchema,
    }),
    prompt: `You are an expert technical recruiter. Analyze this resume against the job description and return a structured evaluation.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 4000)}

Instructions:
- score: overall fit 0-100
- recommendation: STRONG_HIRE (85+), HIRE (70-84), MAYBE (50-69), NO_HIRE (<50)
- summary: 2-3 sentences on overall fit
- skills_match: how well their technical skills match (0-100)
- experience_match: how well their experience level/years match (0-100)
- education_match: how well their education matches (0-100)
- matched_keywords: up to 8 key skills/technologies present in both resume and JD
- strengths: 2-4 specific strengths relative to the role
- gaps: 1-3 specific gaps or concerns`,
  });

  if (!output) {
    throw new Error("Failed to generate resume analysis - no output returned");
  }

  return output;
}
