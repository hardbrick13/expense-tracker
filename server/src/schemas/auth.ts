import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const requestOtpSchema = z.object({ email });

export const verifyOtpSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const deleteAccountSchema = z.object({ email });
