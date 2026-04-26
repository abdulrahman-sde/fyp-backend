import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { listMyInterviewsHandler } from "./interviews.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/my", requireRole("APPLICANT"), listMyInterviewsHandler);

export default router;
