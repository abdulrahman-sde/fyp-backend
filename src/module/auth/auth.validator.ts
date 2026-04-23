import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const onboardingSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  industry: z.string().max(100).optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  size: z.string().max(50).optional(),
  description: z.string().optional(),
  location: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  jobTitle: z.string().max(150).optional(),
});
