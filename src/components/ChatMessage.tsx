import { cn } from '@/lib/utils/cn';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Renders a single chat message as plain text. No markdown or HTML parsing.
 * `whitespace-pre-wrap` preserves newlines; React's default text escaping
 * is the security boundary (SEC-004).
 */
export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] px-4 py-3 rounded-sm',
          isUser
            ? 'bg-ink/8 font-mono text-sm'
            : 'font-serif text-base leading-relaxed',
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
