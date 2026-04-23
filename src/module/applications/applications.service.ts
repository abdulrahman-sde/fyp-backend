import { ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors.js";
import type {
  SubmitApplicationInput,
  ListMyApplicationsQuery,
  ListJobApplicationsQuery,
  ApplicationDecisionInput,
  ApplicationSummary,
  RecruiterApplicationRow,
} from "./applications.types.js";
import * as repo from "./applications.dal.js";
import { analyzeResume } from "../../ai/resume-analysis/analysis.js";

export async function submitApplication(
  userId: string,
  input: SubmitApplicationInput
): Promise<{ id: string; status: string }> {
  const applicant = await repo.findApplicantProfileByUserId(userId);
  if (!applicant) throw new ForbiddenError("Applicant profile not found. Complete onboarding first.");
  if (!applicant.resume) throw new ForbiddenError("Please upload a resume before applying.");

  const job = await repo.findPublishedJobById(input.job_id);
  if (!job) throw new NotFoundError("Job not found or is no longer accepting applications.");

  const existing = await repo.findExistingApplication(applicant.id, input.job_id);
  if (existing) throw new ConflictError("You have already applied for this position.");

  const applicationData = {
    applicant_id: applicant.id,
    job_id: input.job_id,
    status: "APPLIED" as const,
    ...(input.screening_answers.length > 0 && {
      match_details: { screening_answers: input.screening_answers },
    }),
  };

  const application = await repo.createApplication(applicationData);

  // Fire-and-forget AI analysis — don't block the response
  void runResumeAnalysis(application.id, applicant.resume!.raw_text, job.title, job.description ?? "");

  return { id: application.id, status: application.status };
}

async function runResumeAnalysis(
  applicationId: string,
  resumeText: string,
  jobTitle: string,
  jobDescription: string
): Promise<void> {
  try {
    const result = await analyzeResume(resumeText, jobTitle, jobDescription);
    await repo.updateApplicationMatchScore(applicationId, result.score, {
      recommendation: result.recommendation,
      summary: result.summary,
      skills_match: result.skills_match,
      experience_match: result.experience_match,
      education_match: result.education_match,
      matched_keywords: result.matched_keywords,
      strengths: result.strengths,
      gaps: result.gaps,
    });
  } catch (err) {
    console.error("[ResumeAnalysis] Failed for application", applicationId, err);
  }
}

export async function listMyApplications(
  userId: string,
  query: ListMyApplicationsQuery
): Promise<{ applications: ApplicationSummary[]; total: number; page: number; limit: number }> {
  const applicant = await repo.findApplicantProfileByUserId(userId);
  if (!applicant) throw new ForbiddenError("Applicant profile not found.");

  const skip = (query.page - 1) * query.limit;
  const { applications, total } = await repo.findMyApplications(applicant.id, {
    status: query.status,
    skip,
    take: query.limit,
  });

  return {
    applications: applications.map((app) => ({
      id: app.id,
      job_id: app.job_id,
      job_title: app.job.title,
      job_slug: app.job.slug,
      company_name: app.job.company.name,
      location: app.job.location ?? null,
      job_type: app.job.job_type,
      status: app.status,
      match_score: app.match_score ? Number(app.match_score) : null,
      applied_at: app.applied_at.toISOString(),
      updated_at: app.updated_at.toISOString(),
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function checkApplicationStatus(
  userId: string,
  jobId: string
): Promise<{ applied: boolean; status: string | null }> {
  const applicant = await repo.findApplicantProfileByUserId(userId);
  if (!applicant) return { applied: false, status: null };

  const existing = await repo.findExistingApplication(applicant.id, jobId);
  return { applied: !!existing, status: existing?.status ?? null };
}

export async function listJobApplications(
  userId: string,
  jobId: string,
  query: ListJobApplicationsQuery
): Promise<{
  job: { id: string; title: string; slug: string; status: string; company_name: string };
  applications: RecruiterApplicationRow[];
  total: number;
  page: number;
  limit: number;
}> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");

  const skip = (query.page - 1) * query.limit;
  const result = await repo.findJobApplicationsForRecruiter(jobId, recruiter.id, {
    status: query.status,
    skip,
    take: query.limit,
  });

  if (!result) throw new NotFoundError("Job not found or you do not have access.");

  const rows: RecruiterApplicationRow[] = result.applications.map((app) => {
    const firstName = app.applicant.first_name;
    const lastName = app.applicant.last_name;
    const fullName = `${firstName} ${lastName}`.trim();
    const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || app.applicant.user.email.slice(0, 2).toUpperCase();

    const details = app.match_details as Record<string, unknown> | null;

    return {
      id: app.id,
      status: app.status,
      match_score: app.match_score ? Number(app.match_score) : null,
      match_details: details,
      applied_at: app.applied_at.toISOString(),
      updated_at: app.updated_at.toISOString(),
      candidate_name: fullName,
      candidate_email: app.applicant.user.email,
      candidate_title: app.applicant.headline ?? null,
      candidate_location: app.applicant.location ?? null,
      avatar_initials: initials,
      resume_url: app.applicant.resume?.file_key ?? null,
      interview: app.interview ? { id: app.interview.id, status: app.interview.status } : null,
    };
  });

  return {
    job: {
      id: result.job.id,
      title: result.job.title,
      slug: result.job.slug,
      status: result.job.status,
      company_name: result.job.company.name,
    },
    applications: rows,
    total: result.total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateApplicationDecision(
  userId: string,
  applicationId: string,
  input: ApplicationDecisionInput
): Promise<{ id: string; status: string }> {
  const recruiter = await repo.findRecruiterProfileByUserId(userId);
  if (!recruiter) throw new ForbiddenError("Recruiter profile not found.");

  const application = await repo.findApplicationByIdForRecruiter(applicationId, recruiter.id);
  if (!application) throw new NotFoundError("Application not found.");

  const updated = await repo.updateApplicationDecision(
    applicationId,
    input.decision,
    input.rejection_reason
  );

  return { id: updated.id, status: updated.status };
}

