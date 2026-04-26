'use client';

import { useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { postChat } from '@/lib/chat/client';
import { errorMessageFor, type ChatErrorCode } from '@/lib/chat/error-messages';
import { newConversationId } from '@/lib/conversation/id';

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Status = 'idle' | 'streaming' | 'error';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
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
