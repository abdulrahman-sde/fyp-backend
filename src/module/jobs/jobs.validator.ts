import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  requirements: z.string().min(1),
  qualifications: z.string().optional(),
  responsibilities: z.string().optional(),
  location: z.string().max(200).optional(),
  job_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"]).default("FULL_TIME"),
  experience_level: z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"]).default("MID"),
  salary_min: z.number().positive().optional(),
  salary_max: z.number().positive().optional(),
  salary_currency: z.string().length(3).default("USD"),
  deadline: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  screening_questions: z.string().optional(),
});

export const updateJobSchema = createJobSchema.partial();

export const listJobsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateJobStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]),
});
