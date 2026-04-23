import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

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
        interview: { select: { id: true, status: true } },
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
      job: { select: { recruiter_id: true } },
      interview: { select: { id: true, status: true } },
    },
  });
}

export async function updateApplicationDecision(
  id: string,
  decision: "SHORTLISTED" | "REJECTED",
  rejectionReason?: string
) {
  return prisma.application.update({
    where: { id },
    data: {
      status: decision,
      reviewed_at: new Date(),
      ...(decision === "REJECTED" && rejectionReason ? { rejection_reason: rejectionReason } : {}),
    },
  });
}
