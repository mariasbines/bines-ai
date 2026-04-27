'use client';

import { useEffect, useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onAbort: () => void;
  disabled: boolean;
  streaming: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onAbort,
  disabled,
  streaming,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // If the textarea was prefilled (piece-aware preface from /argue?t=…),
    // park the cursor at the end so the visitor types their pushback after
    // the prefill rather than overwriting it.
    const len = el.value.length;
    if (len > 0) el.setSelectionRange(len, len);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !disabled) onSubmit();
      }}
      className="border-t border-ink/15 pt-4 mt-6"
    >
      <label htmlFor="chat-input" className="sr-only">
        Your message
      </label>
      <textarea
        id="chat-input"
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !disabled) onSubmit();
          } else if (e.key === 'Escape' && streaming) {
            onAbort();
          }
        }}
        rows={3}
        disabled={disabled}
        placeholder="push back. ask a question. try to change my mind."
        className="w-full resize-y bg-paper-2 border border-ink/15 px-4 py-3 font-mono text-sm focus:border-accent focus:outline-none"
        style={{ ['--color-accent' as string]: 'var(--color-ruby)' } as React.CSSProperties}
      />
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="font-mono text-xs uppercase tracking-[0.14em] border border-ruby px-4 py-2 text-ruby hover:bg-ruby hover:text-paper transition-colors motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {streaming ? '[ …streaming ]' : '[ push back ]'}
        </button>
      </div>
    </form>
  );
}
