import { z } from "zod";

export const startInterviewSchema = z.object({
  access_token: z.string().min(10).max(256),
});

export const agentCompleteSchema = z.object({
  interview_id: z.string().uuid(),
  agent_secret: z.string().min(1),
  transcript: z.array(
    z.object({
      sequence: z.number().int().nonnegative(),
      question_text: z.string(),
      transcript: z.string(),
    })
  ),
  summary: z.string().optional(),
});
