import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../shared/response.js";
import * as interviewsService from "./interviews.service.js";

export const listMyInterviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const interviews = await interviewsService.listMyInterviews(userId);
  return ok(res, { interviews });
});
