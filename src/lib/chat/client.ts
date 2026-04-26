import type { ChatErrorCode } from './error-messages';

export interface ChatClientOptions {
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  /**
   * Phase A — story 003.001. Stable conversation id minted by `<ChatInterface>`
   * lazily on first submit. When supplied, threaded into the request body so
   * the server can correlate turns of the same chat. Omitted on legacy callers
   * (server falls back to a freshly minted UUID).
   */
  conversation_id?: string;
  /**
   * Phase A — story 003.001. The Fieldwork piece slug the visitor arrived
   * from (when they clicked `[ argue with this ]`). `null` is meaningful —
   * "explicit no-origin" — distinct from `undefined` (field omitted entirely).
   * 003.002 wires the URL capture; this story always passes `null`.
   */
  from_slug?: string | null;
}

export interface ChatClientResult {
  ok: boolean;
  errorCode?: ChatErrorCode;
}

/**
 * POST to /api/chat and stream the plain-text response.
 *
 * The server emits the assistant's text as raw UTF-8 bytes. We decode each
 * chunk and forward it to onDelta. No framing, no JSON parsing, no SSE
 * ceremony — the wire format is just text.
 */
export async function postChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: ChatClientOptions,
): Promise<ChatClientResult> {
  // Construct the body with the new optional fields when supplied. We
  // distinguish `undefined` (omit entirely — preserves the legacy wire shape)
  // from `null` (include verbatim — explicit no-origin signal).
  const payload: Record<string, unknown> = { messages };
  if (options.conversation_id !== undefined) {
    payload.conversation_id = options.conversation_id;
  }
  if (options.from_slug !== undefined) {
    payload.from_slug = options.from_slug;
  }

  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      return { ok: false }; // silent abort
    }
    return { ok: false, errorCode: 'network' };
  }

  if (!response.ok) {
    const code: ChatErrorCode =
      response.status === 429 ? 'rate-limited' : response.status >= 500 ? 'upstream' : 'network';
    return { ok: false, errorCode: code };
  }

  const reader = response.body?.getReader();
  if (!reader) return { ok: false, errorCode: 'network' };

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const tail = decoder.decode();
        if (tail.length > 0) options.onDelta(tail);
        break;
      }
      if (value && value.byteLength > 0) {
        const text = decoder.decode(value, { stream: true });
        if (text.length > 0) options.onDelta(text);
      }
    }
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return { ok: false };
    return { ok: false, errorCode: 'network' };
  }

  return { ok: true };
}
