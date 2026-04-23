import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { resumeUpload } from "../../lib/upload.js";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  recruiterOnboardingHandler,
  candidateOnboardingHandler,
  meHandler,
} from "./auth.controller.js";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.get("/me", requireAuth, meHandler);

router.post(
  "/onboarding/recruiter",
  requireAuth,
  requireRole("RECRUITER"),
  recruiterOnboardingHandler
);

router.post(
  "/onboarding/candidate",
  requireAuth,
  requireRole("APPLICANT"),
  resumeUpload.single("resume"),
  candidateOnboardingHandler
);

export default router;
