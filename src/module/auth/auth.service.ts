import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from "../../shared/errors.js";
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY_MS } from "../../shared/constants.js";
import type { JwtPayload } from "../../shared/types.js";
import type {
  RegisterInput,
  LoginInput,
  RecruiterOnboardingInput,
  CandidateOnboardingInput,
  AuthTokens,
  AuthUser,
  RecruiterProfileShape,
  CandidateProfileShape,
} from "./auth.types.js";
import * as repo from "./auth.dal.js";
import { cloudinary } from "../../lib/cloudinary.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const BCRYPT_ROUNDS = 12;

// ---------- Helpers ----------

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function toAuthUser(
  user: { id: string; email: string; role: AuthUser["role"] },
  recruiterProfile: {
    first_name: string;
    last_name: string;
    phone: string | null;
    job_title: string | null;
    company: { name: string; website: string | null; industry: string | null; size: string | null };
  } | null,
  applicantProfile: {
    first_name: string;
    last_name: string;
    phone: string | null;
    location: string | null;
    interests: string[];
  } | null
): AuthUser {
  if (recruiterProfile) {
    const profile: RecruiterProfileShape = {
      kind: "recruiter",
      firstName: recruiterProfile.first_name,
      lastName: recruiterProfile.last_name,
      phone: recruiterProfile.phone,
      jobTitle: recruiterProfile.job_title,
    };
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile,
      company: {
        name: recruiterProfile.company.name,
        website: recruiterProfile.company.website,
        industry: recruiterProfile.company.industry,
        size: recruiterProfile.company.size,
      },
      onboardingDone: true,
    };
  }

  if (applicantProfile) {
    const profile: CandidateProfileShape = {
      kind: "candidate",
      firstName: applicantProfile.first_name,
      lastName: applicantProfile.last_name,
      phone: applicantProfile.phone,
      location: applicantProfile.location,
      interests: applicantProfile.interests,
    };
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile,
      company: null,
      onboardingDone: true,
    };
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    profile: null,
    company: null,
    onboardingDone: false,
  };
}

async function issueTokens(
  userId: string,
  role: AuthUser["role"],
  meta?: { ip?: string; userAgent?: string }
): Promise<AuthTokens> {
  const accessToken = generateAccessToken({ sub: userId, role });
  const rawRefresh = generateRefreshToken();
  const tokenHash = hashToken(rawRefresh);

  await repo.createRefreshToken({
    user: { connect: { id: userId } },
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    ...(meta?.ip !== undefined && { ip_address: meta.ip }),
    ...(meta?.userAgent !== undefined && { user_agent: meta.userAgent }),
  });

  return { accessToken, refreshToken: rawRefresh };
}

// ---------- Public API ----------

export async function register(
  input: RegisterInput
): Promise<AuthTokens & { user: AuthUser }> {
  const existing = await repo.findUserByEmail(input.email);
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await repo.createUser({
    email: input.email,
    password: passwordHash,
    role: input.role,
  });

  const tokens = await issueTokens(user.id, user.role);
  return { ...tokens, user: toAuthUser(user, null, null) };
}

export async function login(
  input: LoginInput,
  meta: { ip?: string; userAgent?: string }
): Promise<AuthTokens & { user: AuthUser }> {
  const user = await repo.findUserByEmail(input.email);

  if (!user || !user.is_active || user.deleted_at) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  const tokens = await issueTokens(user.id, user.role, meta);

  const full = await repo.findUserById(user.id);
  return {
    ...tokens,
    user: toAuthUser(user, full?.recruiter_profile ?? null, full?.applicant_profile ?? null),
  };
}

export async function refresh(
  rawRefreshToken: string
): Promise<Pick<AuthTokens, "accessToken">> {
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshTokenByHash(tokenHash);

  if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await repo.findUserById(stored.user_id);
  if (!user || !user.is_active || user.deleted_at) {
    throw new UnauthorizedError("Account not found or inactive");
  }

  const accessToken = generateAccessToken({ sub: user.id, role: user.role });
  return { accessToken };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  await repo.revokeRefreshToken(hashToken(rawRefreshToken));
}

export function buildAuthUser(
  full: NonNullable<Awaited<ReturnType<typeof repo.findUserById>>>
): AuthUser {
  return toAuthUser(full, full.recruiter_profile ?? null, full.applicant_profile ?? null);
}

// ---------- Recruiter Onboarding ----------

export async function completeRecruiterOnboarding(
  userId: string,
  input: RecruiterOnboardingInput
): Promise<AuthUser> {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError("User not found");
  if (user.role !== "RECRUITER") throw new ValidationError("Not a recruiter account");
  if (user.recruiter_profile) throw new ConflictError("Onboarding already completed");

  await repo.createCompanyAndRecruiterProfile(
    userId,
    {
      name: input.companyName,
      industry: input.industry ?? null,
      website: input.website || null,
      size: input.size ?? null,
    },
    {
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone ?? null,
      job_title: input.jobTitle ?? null,
    }
  );

  const updated = await repo.findUserById(userId);
  return toAuthUser(user, updated?.recruiter_profile ?? null, null);
}

// ---------- Candidate Onboarding ----------

export async function completeCandidateOnboarding(
  userId: string,
  input: CandidateOnboardingInput,
  resumeFile: Express.Multer.File
): Promise<AuthUser> {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError("User not found");
  if (user.role !== "APPLICANT") throw new ValidationError("Not a candidate account");
  if (user.applicant_profile) throw new ConflictError("Onboarding already completed");

  // Upload PDF to Cloudinary as a raw file
  const uploadResult = await new Promise<{ public_id: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "hireflow/resumes",
        public_id: `${userId}_resume`,
        overwrite: true,
        format: "pdf",
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ public_id: result.public_id, bytes: result.bytes });
      }
    );
    stream.end(resumeFile.buffer);
  });

  // Extract raw text from PDF using pdf-parse
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: resumeFile.buffer });
  const result = await parser.getText();
  const rawText = result.text.trim();

  await repo.createApplicantProfileWithResume(
    userId,
    {
      first_name: input.firstName,
      last_name: input.lastName,
      location: input.location,
      interests: input.interests,
      onboarding_done: true,
    },
    {
      file_name: resumeFile.originalname,
      file_key: uploadResult.public_id,
      file_size_bytes: uploadResult.bytes,
      mime_type: "application/pdf",
      raw_text: rawText,
    }
  );

  const updated = await repo.findUserById(userId);
  return toAuthUser(user, null, updated?.applicant_profile ?? null);
}
