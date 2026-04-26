import { z } from 'zod';

/**
 * Shared push-back submission schema — same Zod used on both client + server.
 * Honeypot field `website` must be empty (or absent) — non-empty fails validation.
 */
export const PUSH_BACK = z.object({
  slug: z.string().min(1).max(200),
  message: z
    .string()
    .min(10, 'at least 10 characters')
    .max(2000, 'at most 2000 characters'),
  name: z.string().max(80).optional().or(z.literal('')),
  website: z.string().max(0).optional(), // honeypot
});
export type PushBack = z.infer<typeof PUSH_BACK>;
