'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { postChat } from '@/lib/chat/client';
import { errorMessageFor, type ChatErrorCode } from '@/lib/chat/error-messages';
import { newConversationId } from '@/lib/conversation/id';

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Status = 'idle' | 'streaming' | 'error';

const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 min — locked from concept Q2

function checkReducedMotion(): boolean {
  // SSR-safe: returns false on server render.
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ChatInterface() {
  const searchParams = useSearchParams();
  /**
   * Phase B — story 003.002. Sticky `?from=<slug>` capture. Lazy initial-state
   * read evaluates the param exactly once on first render; later route
   * changes (visitor pivots to a different `?from=`) do NOT re-tag the
   * conversation. Empty string is normalised to null.
   */
  const [fromSlug] = useState<string | null>(() => {
    const raw = searchParams?.get('from') ?? null;
    if (raw === null || raw === '') return null;
    return raw;
  });
  /**
   * Phase C — piece-aware prefill. When the visitor lands via the
   * [ argue with this ] CTA, the link supplies the piece title in `?t=`,
   * which we drop into the input as `Pushing back on "<title>" — ` so the
   * conversation opens with context. Read once on first render; later
   * route changes do not re-prefill.
   */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>(() => {
    const title = searchParams?.get('t') ?? null;
    if (title === null || title === '') return '';
    return `Pushing back on "${title}" — `;
  });
  const [status, setStatus] = useState<Status>('idle');
  const [errorCode, setErrorCode] = useState<ChatErrorCode | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /**
   * Phase A — story 003.001. Stable conversation id minted lazily on first
   * submit (NOT on mount — empty conversations don't need ids). Reused across
   * every subsequent turn for the lifetime of this component instance; resets
   * only on hard reload (unmount).
   */
  const conversationIdRef = useRef<string | null>(null);
  /**
   * Phase B — story 003.005. Debounce guard for the chat-end beacon. A
   * given `conversation_id` triggers `sendBeacon` at most once for the
   * component lifetime, regardless of how many sources (idle timer,
   * `pagehide`, `beforeunload`) try to fire.
   */
  const firedConversationsRef = useRef<Set<string>>(new Set());

  /**
   * Story 003.005 — fire-and-forget chat-end beacon. Sends
   * `{ conversation_id }` to `/api/argue-judge/run` via
   * `navigator.sendBeacon`. Synchronous return; no awaits. Stable identity
   * via empty deps array (only ref reads inside) so it can sit on
   * `window.addEventListener` without churn.
   */
  const fireChatEnd = useCallback(() => {
    const id = conversationIdRef.current;
    if (id === null) return;
    if (firedConversationsRef.current.has(id)) return;
    firedConversationsRef.current.add(id);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const payload = JSON.stringify({ conversation_id: id });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/argue-judge/run', blob);
      }
      // No-op if sendBeacon is unavailable. Sweep cron is the safety net.
    } catch {
      // Defensive: if Blob construction or sendBeacon throws (very old
      // browsers), swallow silently — sweep covers it.
    }
  }, []);

  /**
   * Story 003.005 — idle timer. Schedules a 2-minute countdown after every
   * activity (user submit OR streaming delta — both mutate `messages`).
   * The cleanup function cancels the previous timer so only one is in-
   * flight at a time. When the countdown elapses without further activity,
   * `fireChatEnd` runs.
   */
  useEffect(() => {
    if (conversationIdRef.current === null) return;
    const handle = setTimeout(() => fireChatEnd(), IDLE_TIMEOUT_MS);
    return () => clearTimeout(handle);
  }, [messages, status, fireChatEnd]);

  /**
   * Story 003.005 — unload listeners. `pagehide` is the mobile-reliable
   * variant; `beforeunload` covers desktop including refresh + close.
   * Both fire the same `fireChatEnd`; the debounce guard makes the second
   * a no-op (Safari fires both during page-close).
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', fireChatEnd);
    window.addEventListener('pagehide', fireChatEnd);
    return () => {
      window.removeEventListener('beforeunload', fireChatEnd);
      window.removeEventListener('pagehide', fireChatEnd);
    };
  }, [fireChatEnd]);

  const handleSubmit = useCallback(async () => {
    const content = input.trim();
    if (!content) return;

    if (conversationIdRef.current === null) {
      conversationIdRef.current = newConversationId();
    }
    const conversation_id = conversationIdRef.current;

    const userMsg: Message = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `u-${Date.now()}`,
      role: 'user',
      content,
    };
    const assistantId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `a-${Date.now()}`;
    const reducedMotion = checkReducedMotion();
    let buffer = '';

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setStatus('streaming');
    setErrorCode(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

    const result = await postChat(history, {
      signal: controller.signal,
      conversation_id,
      from_slug: fromSlug,
      onDelta: (text) => {
        if (reducedMotion) {
          buffer += text;
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + text } : m,
            ),
          );
        }
      },
    });

    if (reducedMotion && buffer.length > 0) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: buffer } : m)),
      );
    }

    if (!result.ok && result.errorCode) {
      setErrorCode(result.errorCode);
      setStatus('error');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0));
    } else {
      setStatus('idle');
    }

    abortRef.current = null;
  }, [input, messages, fromSlug]);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat conversation"
        className="space-y-4 min-h-[200px]"
      >
        {messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} />
        ))}
      </div>

      {errorCode ? (
        <p role="alert" className="mt-4 font-mono text-xs text-ruby">
          {errorMessageFor(errorCode)}
        </p>
      ) : null}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onAbort={handleAbort}
        disabled={status === 'streaming'}
        streaming={status === 'streaming'}
      />

      <p className="mt-4 font-mono text-xs text-ink/50 leading-relaxed">
        what you type is sent to anthropic to generate a reply, and kept on this site for 90 days so maria can see how the chat is used. no ip, no account — just the conversation.
        <span className="block mt-1">
          You&apos;re talking to an AI trained on Maria&apos;s voice. It&apos;s not Maria. It
          gets things wrong sometimes — push back when it does.
        </span>
      </p>
    </div>
  );
}
