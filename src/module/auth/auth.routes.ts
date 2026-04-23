import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  onboardingHandler,
  meHandler,
} from "./auth.controller.js";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post("/onboarding", requireAuth, onboardingHandler);
router.get("/me", requireAuth, meHandler);

export default router;
