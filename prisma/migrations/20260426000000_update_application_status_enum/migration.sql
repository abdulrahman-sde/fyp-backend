-- Add new ApplicationStatus values
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_SCHEDULED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'HIRED';

-- Note: PostgreSQL does not support removing enum values without a full type rebuild.
-- OFFERED is kept as a harmless dead value; no rows use it.
