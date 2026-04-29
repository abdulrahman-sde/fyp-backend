import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors.js";
import * as repo from "./interviews.dal.js";
import { prisma } from "../../lib/prisma.js";
import {
  createInterviewRoom,
  generateCandidateAccessToken,
  getLiveKitWsUrl,
  type RoomMetadata,
} from "../../lib/livekit.js";
import type { AgentCompleteInput } from "./interviews.types.js";
import { evaluateInterview } from "../../ai/interview/evaluate.js";

const AGENT_SHARED_SECRET = process.env.AGENT_WEBHOOK_SECRET ?? "";

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

function buildRoomName(interviewId: string): string {
  return `interview-${interviewId}`;
}

function parseScreeningQuestions(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Authenticated candidate exchanges access_token for a LiveKit JWT.
 * Creates the LiveKit room (idempotent) with rich metadata so the agent worker
 * has everything it needs to conduct the interview.
 */
export async function startInterview(userId: string, accessToken: string) {
  const interview = await repo.findInterviewByAccessToken(accessToken);
  if (!interview) throw new NotFoundError("Interview not found.");

  if (interview.application.applicant.user_id !== userId) {
    throw new ForbiddenError("This interview link does not belong to you.");
  }

  const now = new Date();
  if (now > interview.expires_at) {
    throw new ValidationError("This interview link has expired.");
  }
  if (interview.status === "COMPLETED") {
    throw new ValidationError("This interview has already been completed.");
  }
  if (interview.status === "CANCELLED" || interview.status === "EXPIRED") {
    throw new ValidationError("This interview is no longer available.");
  }

  const fullInterview = await repo.findInterviewById(interview.id);
  if (!fullInterview) throw new NotFoundError("Interview not found.");

  const resumeText = fullInterview.application.applicant.resume?.raw_text ?? "";
  const candidate = fullInterview.application.applicant;
  const job = fullInterview.job;

  const metadata: RoomMetadata = {
    interview_id: fullInterview.id,
    application_id: fullInterview.application_id,
    job_title: job.title,
    job_description: job.description,
    job_requirements: job.requirements,
    screening_questions: parseScreeningQuestions(job.screening_questions),
    candidate_first_name: candidate.first_name,
    candidate_last_name: candidate.last_name,
    resume_text: resumeText.slice(0, 12000),
  };

  const roomName = buildRoomName(fullInterview.id);

  try {
    await createInterviewRoom(roomName, metadata);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (!/already exists/i.test(message)) {
      throw err;
    }
  }

  if (fullInterview.status === "PENDING") {
    await repo.markInterviewStarted(fullInterview.id);
  }

  const identity = `candidate-${candidate.user_id}`;
  const displayName = `${candidate.first_name} ${candidate.last_name}`.trim();
  const lkToken = await generateCandidateAccessToken(roomName, identity, displayName);

  return {
    livekit_url: getLiveKitWsUrl(),
    livekit_token: lkToken,
    room_name: roomName,
    interview_id: fullInterview.id,
    job_title: job.title,
  };
}

/**
 * Called by the Python agent worker when an interview completes.
 * Auth via shared secret in body (the worker is trusted infra, not a public client).
 */
export async function handleAgentComplete(input: AgentCompleteInput) {
  if (!AGENT_SHARED_SECRET) {
    throw new ValidationError("Agent webhook secret not configured.");
  }
  if (input.agent_secret !== AGENT_SHARED_SECRET) {
    throw new ForbiddenError("Invalid agent secret.");
  }

  await repo.persistInterviewTranscript(input.interview_id, input.transcript);

  void runInterviewEvaluation(input.interview_id);

  return { ok: true };
}

async function runInterviewEvaluation(interviewId: string): Promise<void> {
  try {
    const interview = await repo.findInterviewForEvaluation(interviewId);
    if (!interview) {
      console.error("[InterviewEvaluation] Interview not found", interviewId);
      return;
    }

    const candidate = interview.application.applicant;
    const transcript = interview.questions.map((q) => ({
      sequence: q.sequence,
      question_text: q.question_text,
      transcript: q.transcript ?? "",
    }));

    if (transcript.length === 0) {
      console.warn("[InterviewEvaluation] No questions to evaluate", interviewId);
      return;
    }

    const result = await evaluateInterview({
      job_title: interview.job.title,
      job_description: interview.job.description,
      job_requirements: interview.job.requirements,
      candidate_name: `${candidate.first_name} ${candidate.last_name}`.trim(),
      resume_text: candidate.resume?.raw_text ?? "",
      transcript,
    });

    await repo.persistEvaluationReport(interviewId, result);
  } catch (err) {
    console.error("[InterviewEvaluation] Failed for interview", interviewId, err);
  }
}
