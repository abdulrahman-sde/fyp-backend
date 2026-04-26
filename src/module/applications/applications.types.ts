import type { z } from "zod";
import type {
  submitApplicationSchema,
  listMyApplicationsQuerySchema,
  listJobApplicationsQuerySchema,
  applicationDecisionSchema,
} from "./applications.validator.js";

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type ListMyApplicationsQuery = z.infer<typeof listMyApplicationsQuerySchema>;
export type ListJobApplicationsQuery = z.infer<typeof listJobApplicationsQuerySchema>;
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionSchema>;

export interface ApplicationSummary {
  id: string;
  job_id: string;
  job_title: string;
  job_slug: string;
  company_name: string;
  location: string | null;
  job_type: string;
  status: string;
  match_score: number | null;
  applied_at: string;
  updated_at: string;
  interview: { id: string; status: string; scheduled_at: string | null; expires_at: string } | null;
}

export interface RecruiterApplicationRow {
  id: string;
  status: string;
  match_score: number | null;
  match_details: Record<string, unknown> | null;
  applied_at: string;
  updated_at: string;
  candidate_name: string;
  candidate_email: string;
  candidate_title: string | null;
  candidate_location: string | null;
  avatar_initials: string;
  resume_url: string | null;
  interview: { id: string; status: string } | null;
}
