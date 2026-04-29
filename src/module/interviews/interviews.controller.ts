import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, created } from "../../shared/response.js";
import * as interviewsService from "./interviews.service.js";
import { startInterviewSchema, agentCompleteSchema } from "./interviews.validator.js";

export const listMyInterviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const interviews = await interviewsService.listMyInterviews(userId);
  return ok(res, { interviews });
});

export const startInterviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const input = startInterviewSchema.parse(req.body);
  const session = await interviewsService.startInterview(userId, input.access_token);
  return created(res, session, "Interview session started");
});

export const agentCompleteHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = agentCompleteSchema.parse(req.body);
  const result = await interviewsService.handleAgentComplete(input);
  return ok(res, result, "Transcript persisted");
});
