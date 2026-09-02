import { z } from "zod";

export const credentialsSchema = z.object({ username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/), email: z.string().trim().email().max(254), password: z.string().min(12).max(128) });
export const loginSchema = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });
export const setupSchema = credentialsSchema.extend({ websiteName: z.string().trim().min(1).max(80), defaultQuotaBytes: z.number().int().positive(), maxUploadBytes: z.number().int().positive(), publicRegistration: z.boolean() });
export const renameSchema = z.object({ name: z.string().trim().min(1).max(255).refine((name) => !/[\\/\0]/.test(name), "Invalid file name") });
export const settingsSchema = z.object({ websiteName: z.string().trim().min(1).max(80), defaultQuotaBytes: z.number().int().positive(), maxUploadBytes: z.number().int().positive(), publicRegistration: z.boolean() });

