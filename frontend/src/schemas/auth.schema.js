import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  passwordSchema,
  nameSchema
} from "./primitives.js";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

export const registerSchema = z.object({
  name: nameSchema(2, "Full name is required (minimum 2 characters)"),
  email: emailSchema,
  password: passwordSchema,
  mobile: phoneSchema,
  role: z.string().optional().default("guest")
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be exactly 6 digits (numbers only)")
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"]
  });
