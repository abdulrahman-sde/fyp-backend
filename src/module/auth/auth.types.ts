import type { Role } from "../../generated/prisma/client.js";
import type { z } from "zod";
import type { registerSchema, loginSchema, onboardingSchema } from "./auth.validator.js";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  profile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    jobTitle: string | null;
  } | null;
  company: {
    name: string;
    website: string | null;
    industry: string | null;
    size: string | null;
  } | null;
  onboardingDone: boolean;
}
