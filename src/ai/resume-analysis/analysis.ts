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
  red_flags: z.array(z.string()),
  career_progression: z.enum(["STRONG", "STEADY", "UNCLEAR", "CONCERNING"]),
  experience_relevance: z.enum(["HIGHLY_RELEVANT", "RELEVANT", "PARTIALLY_RELEVANT", "NOT_RELEVANT"]),
  has_quantified_achievements: z.boolean(),
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
    prompt: `You are a senior technical recruiter with 15+ years of experience screening candidates. Analyze the resume below against the job description using professional hiring standards.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 4000)}

## Evaluation Framework

Score each dimension honestly. Calibrate against what a hiring manager would actually accept — not just keywords on a page.

### SKILLS MATCH (skills_match 0–100)
Assess technical and domain skill alignment:
- Exact matches to required skills in JD score highest
- Adjacent/transferable skills score partially
- Missing critical skills are major deductions
- Penalize vague language ("familiar with", "exposure to") — these signal weak proficiency
- Reward specificity (versions, certifications, proven deployment)

### EXPERIENCE MATCH (experience_match 0–100)
Relevance outweighs raw years. Evaluate:
- Do past roles involve similar responsibilities to this job?
- Are achievements quantified with real numbers (revenue, team size, time saved, % improvements)?
- Is there clear career progression (promotions, expanded scope, leadership growth)?
- Resumes with quantified achievements signal 2.5x more job readiness than those without
- Penalize job-hopping (< 1 year at multiple consecutive jobs) or unexplained gaps > 6 months
- Consider if the candidate has done what this role requires, not just adjacent things

### EDUCATION MATCH (education_match 0–100)
- Required degree/field: strong match = 85+
- Relevant degree, different field: 60–75
- No degree but strong compensating experience: 50–65
- Missing requirement with no compensation: < 40

### OVERALL SCORE (score 0–100) — weighted composite:
- Skills match: 40%
- Experience match: 40%
- Education match: 20%
Apply a -5 to -15 deduction for each red flag present (job hopping, gaps, vague claims, no metrics).

### RECOMMENDATION
- STRONG_HIRE (85+): Clear top-tier fit, proceed immediately
- HIRE (70–84): Good candidate, worth interviewing with some probing questions
- MAYBE (50–69): Gaps exist — assess in interview; risk present
- NO_HIRE (<50): Material gaps in required skills or experience; not recommended

### MATCHED KEYWORDS
List up to 10 specific skills, technologies, or domain terms that appear in BOTH the resume and the job description. Be precise — "React" not "frontend".

### STRENGTHS (2–4 items)
Each strength must be:
- Specific and evidenced by something in the resume
- Tied directly to a requirement in the JD
- NOT generic (avoid "strong communicator" without evidence)

### GAPS (1–4 items)
Be honest about real gaps a hiring manager would notice:
- Missing required skills or technologies
- Experience level below what the role demands
- No evidence of quantified impact
- Concerning patterns (gaps, frequent job changes)

### RED FLAGS (0–3 items, only include genuine concerns)
Flag only material issues:
- Employment gaps > 6 months without explanation
- Multiple jobs under 1 year (pattern of job-hopping)
- Skills listed but contradicted by work history (e.g. "expert" in X but never used in any role)
- Resume lacks any quantified results across all experience
- Significant overqualification mismatch (may indicate culture/comp risk)
Leave empty array [] if no real red flags exist — do NOT manufacture concerns.

### CAREER PROGRESSION
- STRONG: Clear upward trajectory, promotions, expanding scope
- STEADY: Consistent relevant experience, no red flags, lateral but purposeful moves
- UNCLEAR: Hard to assess from resume structure or gaps in history
- CONCERNING: Regression, frequent changes, or unexplained history

### EXPERIENCE RELEVANCE
- HIGHLY_RELEVANT: Past roles closely mirror the responsibilities of this job
- RELEVANT: Past experience clearly prepares them for this role
- PARTIALLY_RELEVANT: Some overlap but meaningful gaps in direct experience
- NOT_RELEVANT: Background is largely unrelated to this role

### HAS_QUANTIFIED_ACHIEVEMENTS
true if the resume contains at least 2–3 bullet points with real numbers (%, $, team size, time saved, throughput, etc.). false if the resume is vague or descriptive only.

### SUMMARY
Write 2–3 sentences as if briefing a hiring manager: overall fit, strongest signal, and the key question to probe in an interview.`,
  });

  if (!output) {
    throw new Error("Failed to generate resume analysis - no output returned");
  }

  return output;
}
