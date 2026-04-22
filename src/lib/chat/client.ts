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
 * POST to /api/chat and iterate the streaming response.
 *
 * Anthropic's MessageStream.toReadableStream() emits SSE-style frames:
 *   data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"..."}}
 *
 * We parse each `data:` line as JSON and surface `text_delta` payloads
 * via the onDelta callback. Malformed frames are silently skipped.
 *
 * Depends on the Anthropic SDK's stream protocol — stable since 0.20.x.
 * If the SDK shifts, frame parsing may need adjustment.
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
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let lineEnd: number;
      while ((lineEnd = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6);
        try {
          const evt = JSON.parse(jsonStr) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (evt?.type === 'content_block_delta' && evt?.delta?.type === 'text_delta') {
            options.onDelta(evt.delta.text ?? '');
          }
        } catch {
          // Skip malformed frames.
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return { ok: false };
    return { ok: false, errorCode: 'network' };
  }

  return { ok: true };
}
