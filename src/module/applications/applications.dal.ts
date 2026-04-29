import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { ApplicationStatus } from "../../generated/prisma/client.js";
import { randomBytes } from "crypto";

export async function findRecruiterProfileByUserId(userId: string) {
  return prisma.recruiterProfile.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
}

export async function findApplicantProfileByUserId(userId: string) {
  return prisma.applicantProfile.findUnique({
    where: { user_id: userId },
    include: { resume: true },
  });
}

export async function findPublishedJobById(jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, status: "PUBLISHED", deleted_at: null },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      recruiter_id: true,
      company: { select: { name: true } },
    },
  });
}

export async function findExistingApplication(applicantId: string, jobId: string) {
  return prisma.application.findUnique({
    where: { applicant_id_job_id: { applicant_id: applicantId, job_id: jobId } },
    select: { id: true, status: true },
  });
}

export async function createApplication(data: Prisma.ApplicationUncheckedCreateInput) {
  return prisma.application.create({ data });
}

export async function findMyApplications(
  applicantId: string,
  filters: { status: string | undefined; skip: number; take: number }
) {
  const where: Prisma.ApplicationWhereInput = {
    applicant_id: applicantId,
    ...(filters.status && { status: filters.status as Prisma.EnumApplicationStatusFilter }),
  };

  const [applications, total] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      orderBy: { applied_at: "desc" },
      skip: filters.skip,
      take: filters.take,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            location: true,
            job_type: true,
            company: { select: { name: true } },
          },
        },
        interview: {
          select: { id: true, status: true, scheduled_at: true, expires_at: true },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return { applications, total };
}

export async function findApplicationById(id: string, applicantId: string) {
  return prisma.application.findFirst({
    where: { id, applicant_id: applicantId },
    include: {
      job: {
        include: { company: { select: { name: true } } },
      },
    },
  });
}

export async function updateApplicationMatchScore(
  id: string,
  matchScore: number,
  matchDetails: Record<string, unknown>
) {
  return prisma.application.update({
    where: { id },
    data: {
      match_score: matchScore,
      match_details: matchDetails as Prisma.InputJsonValue,
      status: "SCREENING",
    },
  });
}

export async function findJobApplicationsForRecruiter(
  jobId: string,
  recruiterId: string,
  filters: { status: string | undefined; skip: number; take: number }
) {
  // Verify job belongs to recruiter
  const job = await prisma.job.findFirst({
    where: { id: jobId, recruiter_id: recruiterId, deleted_at: null },
    select: { id: true, title: true, slug: true, status: true, company: { select: { name: true } } },
  });
  if (!job) return null;

  const where: Prisma.ApplicationWhereInput = {
    job_id: jobId,
    ...(filters.status && { status: filters.status as Prisma.EnumApplicationStatusFilter }),
  };

  const [applications, total] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      orderBy: [{ match_score: { sort: "desc", nulls: "last" } }, { applied_at: "desc" }],
      skip: filters.skip,
      take: filters.take,
      include: {
        applicant: {
          include: {
            user: { select: { email: true } },
            resume: { select: { file_key: true } },
          },
        },
        interview: {
          select: {
            id: true,
            status: true,
            completed_at: true,
            report: {
              select: {
                overall_score: true,
                pass_fail: true,
                strengths: true,
                weaknesses: true,
                ai_recommendation: true,
                full_report_json: true,
                generated_at: true,
              },
            },
            questions: {
              orderBy: { sequence: "asc" },
              select: {
                sequence: true,
                question_text: true,
                transcript: true,
                score: true,
                score_rationale: true,
              },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return { job, applications, total };
}

export async function findApplicationByIdForRecruiter(id: string, recruiterId: string) {
  return prisma.application.findFirst({
    where: {
      id,
      job: { recruiter_id: recruiterId },
    },
    include: {
      job: { select: { recruiter_id: true, title: true, company: { select: { name: true } } } },
      applicant: { select: { first_name: true, last_name: true, user: { select: { email: true } } } },
      interview: { select: { id: true, status: true } },
    },
  });
}

export async function updateApplicationDecision(
  id: string,
  decision: "SHORTLISTED" | "REJECTED" | "HIRED" | "UNDER_REVIEW",
  rejectionReason?: string,
  customQuestions?: string[],
  interviewWindowStart?: string,
  interviewWindowEnd?: string
) {
  const existing = await prisma.application.findUnique({
    where: { id },
    select: { match_details: true, job_id: true },
  });
  const currentDetails = (existing?.match_details as Record<string, unknown> | null) ?? {};

  return prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id },
      data: {
        status: decision as ApplicationStatus,
        reviewed_at: new Date(),
        ...(decision === "REJECTED" && rejectionReason ? { rejection_reason: rejectionReason } : {}),
        ...(decision === "SHORTLISTED" && customQuestions?.length
          ? {
              match_details: {
                ...currentDetails,
                custom_interview_questions: customQuestions,
              } as Prisma.InputJsonValue,
            }
          : {}),
      },
    });

    if (decision === "SHORTLISTED" && existing) {
      const scheduledAt = interviewWindowStart ? new Date(interviewWindowStart) : new Date();
      // Default window: start now, expire in 7 days
      const expiresAt = interviewWindowEnd
        ? new Date(interviewWindowEnd)
        : new Date(scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      const accessToken = randomBytes(32).toString("hex");

      await tx.interview.upsert({
        where: { application_id: id },
        create: {
          application_id: id,
          job_id: existing.job_id,
          access_token: accessToken,
          status: "PENDING",
          scheduled_at: scheduledAt,
          expires_at: expiresAt,
        },
        update: {
          scheduled_at: scheduledAt,
          expires_at: expiresAt,
          status: "PENDING",
        },
      });
    }

    return updated;
  });
}
