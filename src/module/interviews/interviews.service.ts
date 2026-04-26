import { ForbiddenError } from "../../shared/errors.js";
import * as repo from "./interviews.dal.js";
import { prisma } from "../../lib/prisma.js";

export async function listMyInterviews(userId: string) {
  const applicant = await prisma.applicantProfile.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!applicant) throw new ForbiddenError("Applicant profile not found.");

  const rows = await repo.findInterviewsByApplicantId(applicant.id);

  return rows.map((i) => ({
    id: i.id,
    status: i.status,
    scheduled_at: i.scheduled_at?.toISOString() ?? null,
    expires_at: i.expires_at.toISOString(),
    access_token: i.access_token,
    application_id: i.application.id,
    job_title: i.application.job.title,
    company_name: i.application.job.company.name,
  }));
}
