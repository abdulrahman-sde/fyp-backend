import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { InterviewEvaluationResult } from "../../ai/interview/evaluate.js";

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

export async function findInterviewByAccessToken(accessToken: string) {
  return prisma.interview.findUnique({
    where: { access_token: accessToken },
    include: {
      application: {
        include: {
          applicant: { select: { first_name: true, last_name: true, user_id: true } },
        },
      },
      job: {
        select: {
          title: true,
          description: true,
          requirements: true,
          screening_questions: true,
        },
      },
    },
  });
}

export async function findInterviewById(id: string) {
  return prisma.interview.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          applicant: {
            include: {
              resume: { select: { raw_text: true } },
            },
          },
        },
      },
      job: {
        select: {
          title: true,
          description: true,
          requirements: true,
          screening_questions: true,
        },
      },
    },
  });
}

export async function markInterviewStarted(id: string) {
  return prisma.interview.update({
    where: { id },
    data: { status: "IN_PROGRESS", started_at: new Date() },
  });
}

export async function persistInterviewTranscript(
  interviewId: string,
  rows: Array<{ sequence: number; question_text: string; transcript: string }>
) {
  return prisma.$transaction(async (tx) => {
    await tx.interviewQuestion.deleteMany({ where: { interview_id: interviewId } });

    if (rows.length > 0) {
      const data: Prisma.InterviewQuestionCreateManyInput[] = rows.map((r) => ({
        interview_id: interviewId,
        sequence: r.sequence,
        question_text: r.question_text,
        transcript: r.transcript,
        asked_at: new Date(),
        answered_at: new Date(),
      }));
      await tx.interviewQuestion.createMany({ data });
    }

    await tx.interview.update({
      where: { id: interviewId },
      data: { status: "COMPLETED", completed_at: new Date() },
    });

    await tx.application.update({
      where: { id: (await tx.interview.findUniqueOrThrow({ where: { id: interviewId } })).application_id },
      data: { status: "INTERVIEWED" },
    });
  });
}

export async function findInterviewForEvaluation(id: string) {
  return prisma.interview.findUnique({
    where: { id },
    include: {
      job: { select: { title: true, description: true, requirements: true } },
      application: {
        include: {
          applicant: {
            select: {
              first_name: true,
              last_name: true,
              resume: { select: { raw_text: true } },
            },
          },
        },
      },
      questions: {
        orderBy: { sequence: "asc" },
        select: { sequence: true, question_text: true, transcript: true },
      },
    },
  });
}

export async function persistEvaluationReport(
  interviewId: string,
  result: InterviewEvaluationResult
) {
  return prisma.$transaction(async (tx) => {
    await tx.evaluationReport.upsert({
      where: { interview_id: interviewId },
      create: {
        interview_id: interviewId,
        overall_score: result.overall_score,
        pass_fail: result.pass_fail,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        ai_recommendation: result.ai_recommendation,
        full_report_json: result as unknown as Prisma.InputJsonValue,
      },
      update: {
        overall_score: result.overall_score,
        pass_fail: result.pass_fail,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        ai_recommendation: result.ai_recommendation,
        full_report_json: result as unknown as Prisma.InputJsonValue,
      },
    });

    for (const q of result.per_question) {
      await tx.interviewQuestion.updateMany({
        where: { interview_id: interviewId, sequence: q.sequence },
        data: { score: q.score, score_rationale: q.rationale },
      });
    }
  });
}
