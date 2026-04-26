/**
 * Voice-appropriate error copy for chat client. No server-only imports —
 * safe to use in client components.
 */
export type ChatErrorCode = 'rate-limited' | 'upstream' | 'network';

export function errorMessageFor(code: ChatErrorCode): string {
  switch (code) {
    case 'rate-limited':
      return "ease up — we've had a lot of arguing today.";
    case 'upstream':
      return "Claude's having a moment. Try again in a sec.";
    case 'network':
      return "that didn't go through — try once more.";
  }
}
