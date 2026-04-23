import { prisma } from "../../lib/prisma.js";
import type {
  User,
  RecruiterProfile,
  Company,
  RefreshToken,
  Prisma,
} from "../../generated/prisma/client.js";

// ---------- User ----------

export async function findUserByEmail(
  email: string
): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(
  id: string
): Promise<(User & { recruiter_profile: (RecruiterProfile & { company: Company }) | null }) | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { recruiter_profile: { include: { company: true } } },
  });
}

export async function createUser(
  data: Prisma.UserCreateInput
): Promise<User> {
  return prisma.user.create({ data });
}

// ---------- Refresh Token ----------

export async function createRefreshToken(
  data: Prisma.RefreshTokenCreateInput
): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data });
}

export async function findRefreshTokenByHash(
  tokenHash: string
): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token_hash: tokenHash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

// ---------- Onboarding ----------

export async function createCompanyAndRecruiterProfile(
  userId: string,
  company: Prisma.CompanyCreateInput,
  profile: Omit<Prisma.RecruiterProfileUncheckedCreateInput, "company_id" | "user_id">
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({ data: company });
    await tx.recruiterProfile.create({
      data: { ...profile, user_id: userId, company_id: created.id },
    });
  });
}
