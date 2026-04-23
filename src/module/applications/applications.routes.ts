import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  submitApplicationHandler,
  listMyApplicationsHandler,
  checkApplicationStatusHandler,
  listJobApplicationsHandler,
  updateApplicationDecisionHandler,
} from "./applications.controller.js";

const router = Router();

router.use(requireAuth);

// Candidate routes
router.post("/", submitApplicationHandler);
router.get("/", listMyApplicationsHandler);
router.get("/status/:jobId", checkApplicationStatusHandler);

// Recruiter routes
router.get("/recruiter/:jobId", requireRole("RECRUITER"), listJobApplicationsHandler);
router.patch("/:id/decision", requireRole("RECRUITER"), updateApplicationDecisionHandler);

export default router;
