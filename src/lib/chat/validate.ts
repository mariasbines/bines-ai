import { z } from 'zod';

/**
 * Input validation for the /api/chat request body.
 * Extracted from route.ts for testability.
 */

export const MAX_MESSAGE_CHARS = 800; // AC-004 (tightened post-launch — Hemingway sizing, blocks essay-paste)
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
  // Phase A additions (story 003.001 of pushback-v2). Both optional; clients
  // running pre-Phase-A bundles continue to validate. `from_slug` nullable so
  // 003.002 can pass `null` explicitly when the visitor hit /argue directly
  // (no `?from=` slug to capture).
  conversation_id: z.string().uuid().optional(),
  from_slug: z.string().nullable().optional(),
});

export type ChatMessage = z.infer<typeof CHAT_REQUEST>['messages'][number];

/**
 * Validation result. The `ok: true` branch carries the truncated messages and
 * the optional Phase A fields (`conversation_id`, `from_slug`) when supplied;
 * the route mints a server-side fallback for `conversation_id` when absent.
 */
export type ValidateResult =
  | {
      ok: true;
      messages: ChatMessage[];
      conversation_id?: string;
      from_slug?: string | null;
    }
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
  return {
    ok: true,
    messages: truncated,
    conversation_id: parsed.data.conversation_id,
    from_slug: parsed.data.from_slug,
  };
}
