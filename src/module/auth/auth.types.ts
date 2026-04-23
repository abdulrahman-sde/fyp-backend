import type { Role } from "../../generated/prisma/client.js";
import type { z } from "zod";
import type {
  registerSchema,
  loginSchema,
  recruiterOnboardingSchema,
  candidateOnboardingSchema,
} from "./auth.validator.js";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RecruiterOnboardingInput = z.infer<typeof recruiterOnboardingSchema>;
export type CandidateOnboardingInput = z.infer<typeof candidateOnboardingSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  profile: RecruiterProfileShape | CandidateProfileShape | null;
  company: CompanyShape | null;
  onboardingDone: boolean;
}

export interface RecruiterProfileShape {
  kind: "recruiter";
  firstName: string;
  lastName: string;
  phone: string | null;
  jobTitle: string | null;
}

export interface CandidateProfileShape {
  kind: "candidate";
  firstName: string;
  lastName: string;
  phone: string | null;
  location: string | null;
  interests: string[];
}

export interface CompanyShape {
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
}
