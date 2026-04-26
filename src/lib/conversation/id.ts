/**
 * Mint a fresh UUID v4 for use as a conversation_id on chat round-trips.
 *
 * Pure module — no env reads, no side effects. Named export so consumers can
 * `vi.mock('@/lib/conversation/id', () => ({ newConversationId: ... }))`
 * deterministically in tests.
 *
 * Phase A foundation (story 003.001 of the pushback-v2 epic). Threaded by
 * `<ChatInterface>` lazily on first submit, and by `/api/chat` as a server-
 * side fallback when a request omits the field.
 *
 * Runs on both Edge runtime (route) and the browser (`<ChatInterface>`); both
 * expose `crypto.randomUUID()` natively (Node ≥ 18, all modern browsers).
 */
export function newConversationId(): string {
  return crypto.randomUUID();
}
