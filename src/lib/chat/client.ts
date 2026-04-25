import type { ChatErrorCode } from './error-messages';

export interface ChatClientOptions {
  signal?: AbortSignal;
  onDelta: (text: string) => void;
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
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
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
