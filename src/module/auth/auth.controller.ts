import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, created, noContent } from "../../shared/response.js";
import { COOKIE_NAMES, REFRESH_TOKEN_EXPIRY_SECONDS } from "../../shared/constants.js";
import {
  registerSchema,
  loginSchema,
  recruiterOnboardingSchema,
  candidateOnboardingSchema,
} from "./auth.validator.js";
import * as authService from "./auth.service.js";
import * as repo from "./auth.dal.js";
import { UnauthorizedError, NotFoundError, ValidationError } from "../../shared/errors.js";

const IS_PROD = process.env.NODE_ENV === "production";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = { httpOnly: true, secure: IS_PROD, sameSite: "lax" as const };
  res.cookie(COOKIE_NAMES.ACCESS, accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie(COOKIE_NAMES.REFRESH, refreshToken, {
    ...base,
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
    path: "/api/auth",
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS);
  res.clearCookie(COOKIE_NAMES.REFRESH, { path: "/api/auth" });
}

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.register(input);
  setAuthCookies(res, accessToken, refreshToken);
  return created(res, { user });
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.login(input, {
    ...(req.ip !== undefined && { ip: req.ip }),
    ...(req.headers["user-agent"] !== undefined && { userAgent: req.headers["user-agent"] }),
  });
  setAuthCookies(res, accessToken, refreshToken);
  return ok(res, { user });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined;
  if (!raw) throw new UnauthorizedError("No refresh token");

  const { accessToken } = await authService.refresh(raw);

  res.cookie(COOKIE_NAMES.ACCESS, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });

  return ok(res, { accessToken });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined;
  if (raw) await authService.logout(raw);
  clearAuthCookies(res);
  return noContent(res);
});

export const recruiterOnboardingHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const input = recruiterOnboardingSchema.parse(req.body);
  const user = await authService.completeRecruiterOnboarding(userId, input);
  return ok(res, { user });
});

export const candidateOnboardingHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const file = req.file;
  if (!file) throw new ValidationError("Resume PDF is required");

  const input = candidateOnboardingSchema.parse({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    location: req.body.location,
    interests: req.body.interests,
  });

  const user = await authService.completeCandidateOnboarding(userId, input, file);
  return ok(res, { user });
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const full = await repo.findUserById(req.user!.sub);
  if (!full) throw new NotFoundError("User not found");
  const user = authService.buildAuthUser(full);
  return ok(res, { user });
});
