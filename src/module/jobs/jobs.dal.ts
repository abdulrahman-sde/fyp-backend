import { prisma } from "../../lib/prisma.js";
import type { Job, Prisma } from "../../generated/prisma/client.js";

export async function findRecruiterProfileByUserId(userId: string) {
  return prisma.recruiterProfile.findUnique({
    where: { user_id: userId },
    include: { company: true },
  });
}

export async function createJob(data: Prisma.JobUncheckedCreateInput): Promise<Job> {
  return prisma.job.create({ data });
}

export async function findJobsByRecruiter(
  recruiterId: string,
  filters: { status: string | undefined; skip: number; take: number }
) {
  const where: Prisma.JobWhereInput = {
    recruiter_id: recruiterId,
    deleted_at: null,
    ...(filters.status && { status: filters.status as Prisma.EnumJobStatusFilter }),
  };

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: filters.skip,
      take: filters.take,
      include: {
        _count: { select: { applications: true } },
        applications: {
          where: { match_score: { gte: 70 } },
          select: { id: true },
        },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total };
}

export async function findJobById(id: string, recruiterId: string) {
  return prisma.job.findFirst({
    where: { id, recruiter_id: recruiterId, deleted_at: null },
    include: {
      company: { select: { name: true } },
      _count: { select: { applications: true } },
      applications: {
        where: { match_score: { gte: 70 } },
        orderBy: { match_score: "desc" },
        take: 10,
        include: {
          applicant: {
            select: { first_name: true, last_name: true },
          },
        },
      },
    },
  });
}

export async function updateJob(
  id: string,
  recruiterId: string,
  data: Prisma.JobUpdateInput
): Promise<Job> {
  return prisma.job.update({
    where: { id, recruiter_id: recruiterId },
    data,
  });
}

export async function softDeleteJob(id: string, recruiterId: string): Promise<void> {
  await prisma.job.update({
    where: { id, recruiter_id: recruiterId },
    data: { deleted_at: new Date() },
  });
}

export async function jobBelongsToRecruiter(id: string, recruiterId: string): Promise<boolean> {
  const job = await prisma.job.findFirst({
    where: { id, recruiter_id: recruiterId, deleted_at: null },
    select: { id: true },
  });
  return job !== null;
}

export async function getDashboardStats(recruiterId: string) {
  const [activePostings, totalApplications, pendingInterviews] = await prisma.$transaction([
    prisma.job.count({
      where: { recruiter_id: recruiterId, status: "PUBLISHED", deleted_at: null },
    }),
    prisma.application.count({
      where: { job: { recruiter_id: recruiterId, deleted_at: null } },
    }),
    prisma.application.count({
      where: {
        job: { recruiter_id: recruiterId, deleted_at: null },
        status: "INTERVIEWED",
      },
    }),
  ]);

  return { activePostings, totalApplications, pendingInterviews };
}

export async function findPublishedJobBySlug(slug: string) {
  return prisma.job.findFirst({
    where: { slug, status: "PUBLISHED", deleted_at: null },
    include: {
      company: {
        select: { name: true, website: true, industry: true },
      },
    },
  });
}

export async function findPublishedJobs(filters: {
  search: string | undefined;
  job_type: string | undefined;
  experience_level: string | undefined;
  location: string | undefined;
  skip: number;
  take: number;
}) {
  const where: Prisma.JobWhereInput = {
    status: "PUBLISHED",
    deleted_at: null,
    ...(filters.job_type && { job_type: filters.job_type as Prisma.EnumJobTypeFilter }),
    ...(filters.experience_level && { experience_level: filters.experience_level as Prisma.EnumExperienceLevelFilter }),
    ...(filters.location && {
      location: { contains: filters.location, mode: "insensitive" as const },
    }),
    ...(filters.search && {
      OR: [
        { title: { contains: filters.search, mode: "insensitive" as const } },
        { description: { contains: filters.search, mode: "insensitive" as const } },
        { requirements: { contains: filters.search, mode: "insensitive" as const } },
        { company: { name: { contains: filters.search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      orderBy: { published_at: "desc" },
      skip: filters.skip,
      take: filters.take,
      include: {
        company: { select: { name: true, industry: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total };
}
