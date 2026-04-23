import type { z } from "zod";
import type {
  createJobSchema,
  updateJobSchema,
  listJobsQuerySchema,
  updateJobStatusSchema,
} from "./jobs.validator.js";

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;

export interface JobSummary {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  job_type: string;
  experience_level: string;
  status: string;
  applicants_count: number;
  ai_matches_count: number;
  created_at: string;
  published_at: string | null;
  deadline: string | null;
  share_link: string;
}

export interface JobDetail extends JobSummary {
  description: string;
  requirements: string;
  qualifications: string | null;
  responsibilities: string | null;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string;
  company_name: string;
  screening_questions: string | null;
  top_matches: Array<{
    id: string;
    applicant_name: string;
    match_score: number;
    status: string;
  }>;
}

export interface PublicJobDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  requirements: string;
  qualifications: string | null;
  responsibilities: string | null;
  location: string | null;
  job_type: string;
  experience_level: string;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string;
  deadline: string | null;
  published_at: string;
  company_name: string;
  company_website: string | null;
  company_industry: string | null;
  share_link: string;
}
