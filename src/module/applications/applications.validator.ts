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
    .enum(["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEWED", "OFFERED", "REJECTED", "WITHDRAWN"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const listJobApplicationsQuerySchema = z.object({
  status: z
    .enum(["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEWED", "OFFERED", "REJECTED", "WITHDRAWN"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const applicationDecisionSchema = z.object({
  decision: z.enum(["SHORTLISTED", "REJECTED"] as const),
  rejection_reason: z.string().max(500).optional(),
});
