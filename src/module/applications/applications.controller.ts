import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, created } from "../../shared/response.js";
import {
  submitApplicationSchema,
  listMyApplicationsQuerySchema,
  listJobApplicationsQuerySchema,
  applicationDecisionSchema,
} from "./applications.validator.js";
import * as applicationsService from "./applications.service.js";

export const submitApplicationHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const input = submitApplicationSchema.parse(req.body);
  const result = await applicationsService.submitApplication(userId, input);
  return created(res, { application: result }, "Application submitted successfully");
});

export const listMyApplicationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const query = listMyApplicationsQuerySchema.parse(req.query);
  const result = await applicationsService.listMyApplications(userId, query);
  return ok(res, result);
});

export const checkApplicationStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const jobId = req.params["jobId"] as string;
  const result = await applicationsService.checkApplicationStatus(userId, jobId);
  return ok(res, result);
});

export const listJobApplicationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const jobId = req.params["jobId"] as string;
  const query = listJobApplicationsQuerySchema.parse(req.query);
  const result = await applicationsService.listJobApplications(userId, jobId, query);
  return ok(res, result);
});

export const updateApplicationDecisionHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const applicationId = req.params["id"] as string;
  const input = applicationDecisionSchema.parse(req.body);
  const result = await applicationsService.updateApplicationDecision(userId, applicationId, input);
  return ok(res, { application: result }, "Application decision updated");
});
