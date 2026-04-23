import crypto from "crypto";
import { NotFoundError, ForbiddenError } from "../../shared/errors.js";
import type {
  CreateJobInput,
  UpdateJobInput,
  ListJobsQuery,
  UpdateJobStatusInput,
  JobSummary,
  JobDetail,
  PublicJobDetail,
  PublicJobSummary,
} from "./jobs.types.js";
import type { z } from "zod";
import type { listPublicJobsQuerySchema } from "./jobs.validator.js";

type ListPublicJobsQuery = z.infer<typeof listPublicJobsQuerySchema>;
import * as repo from "./jobs.dal.js";

const CANDIDATE_BASE_URL = process.env["CANDIDATE_BASE_URL"] ?? "http://localhost:3000";

function shareLink(slug: string): string {
  return `${CANDIDATE_BASE_URL}/jobs/${slug}`;
}

function makeSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

function toJobSummary(job: Awaited<ReturnType<typeof repo.findJobsByRecruiter>>["jobs"][number]): JobSummary {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    location: job.location,
    job_type: job.job_type,
    experience_level: job.experience_level,
    status: job.status,
    applicants_count: job._count.applications,
    ai_matches_count: job.applications.length,
    created_at: job.created_at.toISOString(),
    published_at: job.published_at?.toISOString() ?? null,
    deadline: job.deadline?.toISOString() ?? null,
    share_link: shareLink(job.slug),
  };
}

export async function createJob(
  userId: string,
  input: CreateJobInput
): Promise<JobSummary> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found. Complete onboarding first.");

  const job = await repo.createJob({
    recruiter_id: recruiter.id,
    company_id: recruiter.company_id,
    title: input.title,
    description: input.description,
    requirements: input.requirements,
    qualifications: input.qualifications ?? null,
    responsibilities: input.responsibilities ?? null,
    location: input.location ?? null,
    job_type: input.job_type,
    experience_level: input.experience_level,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    salary_currency: input.salary_currency,
    status: input.status,
    slug: makeSlug(input.title),
    deadline: input.deadline ? new Date(input.deadline) : null,
    published_at: input.status === "PUBLISHED" ? new Date() : null,
    screening_questions: input.screening_questions ?? null,
  });

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    location: job.location,
    job_type: job.job_type,
    experience_level: job.experience_level,
    status: job.status,
    applicants_count: 0,
    ai_matches_count: 0,
    created_at: job.created_at.toISOString(),
    published_at: job.published_at?.toISOString() ?? null,
    deadline: job.deadline?.toISOString() ?? null,
    share_link: shareLink(job.slug),
  };
}

export async function listJobs(
  userId: string,
  query: ListJobsQuery
): Promise<{ jobs: JobSummary[]; total: number; page: number; limit: number }> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");

  const skip = (query.page - 1) * query.limit;
  const { jobs, total } = await repo.findJobsByRecruiter(recruiter.id, {
    status: query.status,
    skip,
    take: query.limit,
  });

  return {
    jobs: jobs.map(toJobSummary),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getJobById(userId: string, jobId: string): Promise<JobDetail> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");

  const job = await repo.findJobById(jobId, recruiter.id);
  if (!job) throw new NotFoundError("Job not found");

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    location: job.location,
    job_type: job.job_type,
    experience_level: job.experience_level,
    status: job.status,
    applicants_count: job._count.applications,
    ai_matches_count: job.applications.length,
    created_at: job.created_at.toISOString(),
    published_at: job.published_at?.toISOString() ?? null,
    deadline: job.deadline?.toISOString() ?? null,
    share_link: shareLink(job.slug),
    description: job.description,
    requirements: job.requirements,
    qualifications: job.qualifications,
    responsibilities: job.responsibilities,
    salary_min: job.salary_min?.toString() ?? null,
    salary_max: job.salary_max?.toString() ?? null,
    salary_currency: job.salary_currency,
    company_name: job.company.name,
    screening_questions: job.screening_questions ?? null,
    top_matches: job.applications.map((app) => ({
      id: app.id,
      applicant_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
      match_score: Number(app.match_score ?? 0),
      status: app.status,
    })),
  };
}

export async function updateJob(
  userId: string,
  jobId: string,
  input: UpdateJobInput
): Promise<JobSummary> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");

  const exists = await repo.jobBelongsToRecruiter(jobId, recruiter.id);
  if (!exists) throw new NotFoundError("Job not found");

  const updated = await repo.updateJob(jobId, recruiter.id, {
    ...(input.title && { title: input.title }),
    ...(input.description && { description: input.description }),
    ...(input.requirements && { requirements: input.requirements }),
    ...(input.qualifications !== undefined && { qualifications: input.qualifications }),
    ...(input.responsibilities !== undefined && { responsibilities: input.responsibilities }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.job_type && { job_type: input.job_type }),
    ...(input.experience_level && { experience_level: input.experience_level }),
    ...(input.salary_min !== undefined && { salary_min: input.salary_min }),
    ...(input.salary_max !== undefined && { salary_max: input.salary_max }),
    ...(input.salary_currency && { salary_currency: input.salary_currency }),
    ...(input.deadline !== undefined && { deadline: input.deadline ? new Date(input.deadline) : null }),
    ...(input.screening_questions !== undefined && { screening_questions: input.screening_questions }),
    ...(input.status && {
      status: input.status,
      ...(input.status === "PUBLISHED" && { published_at: new Date() }),
    }),
  });

  return {
    id: updated.id,
    slug: updated.slug,
    title: updated.title,
    location: updated.location,
    job_type: updated.job_type,
    experience_level: updated.experience_level,
    status: updated.status,
    applicants_count: 0,
    ai_matches_count: 0,
    created_at: updated.created_at.toISOString(),
    published_at: updated.published_at?.toISOString() ?? null,
    deadline: updated.deadline?.toISOString() ?? null,
    share_link: shareLink(updated.slug),
  };
}

export async function updateJobStatus(
  userId: string,
  jobId: string,
  input: UpdateJobStatusInput
): Promise<JobSummary> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");

  const exists = await repo.jobBelongsToRecruiter(jobId, recruiter.id);
  if (!exists) throw new NotFoundError("Job not found");

  const updated = await repo.updateJob(jobId, recruiter.id, {
    status: input.status,
    ...(input.status === "PUBLISHED" && { published_at: new Date() }),
  });

  return {
    id: updated.id,
    slug: updated.slug,
    title: updated.title,
    location: updated.location,
    job_type: updated.job_type,
    experience_level: updated.experience_level,
    status: updated.status,
    applicants_count: 0,
    ai_matches_count: 0,
    created_at: updated.created_at.toISOString(),
    published_at: updated.published_at?.toISOString() ?? null,
    deadline: updated.deadline?.toISOString() ?? null,
    share_link: shareLink(updated.slug),
  };
}

export async function deleteJob(userId: string, jobId: string): Promise<void> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");

  const exists = await repo.jobBelongsToRecruiter(jobId, recruiter.id);
  if (!exists) throw new NotFoundError("Job not found");

  await repo.softDeleteJob(jobId, recruiter.id);
}

export async function getDashboardStats(
  userId: string
): Promise<{ activePostings: number; totalApplications: number; pendingInterviews: number }> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");
  return repo.getDashboardStats(recruiter.id);
}

export async function getPublicJob(slug: string): Promise<PublicJobDetail> {
  const job = await repo.findPublishedJobBySlug(slug);
  if (!job) throw new NotFoundError("Job not found");

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    qualifications: job.qualifications ?? null,
    responsibilities: job.responsibilities ?? null,
    location: job.location ?? null,
    job_type: job.job_type,
    experience_level: job.experience_level,
    salary_min: job.salary_min?.toString() ?? null,
    salary_max: job.salary_max?.toString() ?? null,
    salary_currency: job.salary_currency,
    deadline: job.deadline?.toISOString() ?? null,
    published_at: job.published_at!.toISOString(),
    company_name: job.company.name,
    company_website: job.company.website ?? null,
    company_industry: job.company.industry ?? null,
    share_link: shareLink(job.slug),
    screening_questions: job.screening_questions ?? null,
  };
}

export async function listPublicJobs(
  query: ListPublicJobsQuery
): Promise<{ jobs: PublicJobSummary[]; total: number; page: number; limit: number }> {
  const skip = (query.page - 1) * query.limit;
  const { jobs, total } = await repo.findPublishedJobs({
    search: query.search,
    job_type: query.job_type,
    experience_level: query.experience_level,
    location: query.location,
    skip,
    take: query.limit,
  });

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      slug: job.slug,
      title: job.title,
      location: job.location ?? null,
      job_type: job.job_type,
      experience_level: job.experience_level,
      salary_min: job.salary_min?.toString() ?? null,
      salary_max: job.salary_max?.toString() ?? null,
      salary_currency: job.salary_currency,
      deadline: job.deadline?.toISOString() ?? null,
      published_at: job.published_at!.toISOString(),
      company_name: job.company.name,
      company_industry: job.company.industry ?? null,
      applicants_count: job._count.applications,
      share_link: shareLink(job.slug),
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}
