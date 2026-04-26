import { z } from "zod";

export const submitApplicationSchema = z.object({
  job_id: z.string().uuid(),
  screening_answers: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
    )
    .optional()
    .default([]),
});

export const listMyApplicationsQuerySchema = z.object({
  status: z
    .enum(["APPLIED", "SCREENING", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "HIRED", "REJECTED", "WITHDRAWN"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const listJobApplicationsQuerySchema = z.object({
  status: z
    .enum(["APPLIED", "SCREENING", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "HIRED", "REJECTED", "WITHDRAWN"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const applicationDecisionSchema = z.object({
  decision: z.enum(["SHORTLISTED", "REJECTED", "HIRED", "UNDER_REVIEW"] as const),
  rejection_reason: z.string().max(500).optional(),
  custom_questions: z
    .array(z.string().min(1).max(500))
    .max(10)
    .optional(),
  interview_window_start: z.string().datetime().optional(),
  interview_window_end: z.string().datetime().optional(),
});
