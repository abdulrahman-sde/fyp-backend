import { prisma } from "../../lib/prisma.js";

export async function findInterviewsByApplicantId(applicantId: string) {
  return prisma.interview.findMany({
    where: {
      application: { applicant_id: applicantId },
    },
    orderBy: { scheduled_at: "asc" },
    select: {
      id: true,
      status: true,
      scheduled_at: true,
      expires_at: true,
      access_token: true,
      application: {
        select: {
          id: true,
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}
