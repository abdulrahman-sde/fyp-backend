import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  listMyInterviewsHandler,
  startInterviewHandler,
  agentCompleteHandler,
} from "./interviews.controller.js";

const router = Router();

// Public (called by trusted Python agent worker, auth via shared secret in body)
router.post("/agent/complete", agentCompleteHandler);

// Authenticated candidate routes
router.use(requireAuth);

router.get("/my", requireRole("APPLICANT"), listMyInterviewsHandler);
router.post("/start", requireRole("APPLICANT"), startInterviewHandler);

export default router;
