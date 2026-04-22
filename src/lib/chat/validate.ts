import { z } from 'zod';

/**
 * Input validation for the /api/chat request body.
 * Extracted from route.ts for testability.
 */

export const MAX_MESSAGE_CHARS = 4000; // AC-004
export const MAX_TURNS = 10; // AC-005

export const CHAT_REQUEST = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export type ChatMessage = z.infer<typeof CHAT_REQUEST>['messages'][number];

export type ValidateResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; status: 400 | 413; error: string; category: 'input' };

export function validateRequest(body: unknown): ValidateResult {
  const parsed = CHAT_REQUEST.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: 'Invalid request shape', category: 'input' };
  }
  for (const m of parsed.data.messages) {
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        status: 413,
        error: `Message too long (max ${MAX_MESSAGE_CHARS} chars)`,
        category: 'input',
      };
    }
  }
  // Silent truncation: keep only the most recent MAX_TURNS messages (AC-005).
  const truncated = parsed.data.messages.slice(-MAX_TURNS);
  return { ok: true, messages: truncated };
}
