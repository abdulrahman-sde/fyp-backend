import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createJobHandler,
  listJobsHandler,
  getJobHandler,
  updateJobHandler,
  updateJobStatusHandler,
  deleteJobHandler,
  getPublicJobHandler,
  listPublicJobsHandler,
  getDashboardStatsHandler,
} from "./jobs.controller.js";

const router = Router();

// Public — no auth required
router.get("/public", listPublicJobsHandler);
router.get("/public/:slug", getPublicJobHandler);

router.use(requireAuth);

router.get("/stats/dashboard", getDashboardStatsHandler);
router.get("/", listJobsHandler);
router.post("/", createJobHandler);
router.get("/:id", getJobHandler);
router.put("/:id", updateJobHandler);
router.patch("/:id/status", updateJobStatusHandler);
router.delete("/:id", deleteJobHandler);

export default router;
