import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, created, noContent } from "../../shared/response.js";
import {
  createJobSchema,
  updateJobSchema,
  listJobsQuerySchema,
  updateJobStatusSchema,
} from "./jobs.validator.js";
import * as jobsService from "./jobs.service.js";

export const createJobHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const input = createJobSchema.parse(req.body);
  const job = await jobsService.createJob(userId, input);
  return created(res, { job }, "Job created successfully");
});

export const listJobsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const query = listJobsQuerySchema.parse(req.query);
  const result = await jobsService.listJobs(userId, query);
  return ok(res, result);
});

export const getJobHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  const job = await jobsService.getJobById(userId, id);
  return ok(res, { job });
});

export const updateJobHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  const input = updateJobSchema.parse(req.body);
  const job = await jobsService.updateJob(userId, id, input);
  return ok(res, { job });
});

export const updateJobStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  const input = updateJobStatusSchema.parse(req.body);
  const job = await jobsService.updateJobStatus(userId, id, input);
  return ok(res, { job });
});

export const deleteJobHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  await jobsService.deleteJob(userId, id);
  return noContent(res);
});

export const getDashboardStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const stats = await jobsService.getDashboardStats(userId);
  return ok(res, { stats });
});

export const getPublicJobHandler = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.params["slug"] as string;
  const job = await jobsService.getPublicJob(slug);
  return ok(res, { job });
});
