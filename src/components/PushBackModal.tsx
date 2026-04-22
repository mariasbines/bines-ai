'use client';

import { useEffect, useRef, useState } from 'react';
import { PUSH_BACK } from '@/lib/push-back/schema';

interface PushBackModalProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  title?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function PushBackModal({ open, onClose, slug, title }: PushBackModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const h = () => onClose();
    d.addEventListener('close', h);
    return () => d.removeEventListener('close', h);
  }, [onClose]);

  // Auto-close 2s after success.
  useEffect(() => {
    if (status !== 'success') return;
    const t = window.setTimeout(() => {
      onClose();
      setStatus('idle');
      setMessage('');
      setName('');
      setErrorText(null);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [status, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const localParse = PUSH_BACK.safeParse({ slug, message, name, website });
    if (!localParse.success) {
      setStatus('error');
      setErrorText('message needs to be 10–2000 characters.');
      return;
    }
    setStatus('submitting');
    setErrorText(null);
    try {
      const res = await fetch('/api/push-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, message, name, website }),
      });
      if (res.ok) {
        setStatus('success');
        return;
      }
      const code =
        res.status === 429
          ? "steady on — we've had a lot of pushback already. try again in a bit."
          : res.status === 400
            ? 'that submission got flagged. try rewording it.'
            : "couldn't send that through. try once more.";
      setErrorText(code);
      setStatus('error');
    } catch {
      setErrorText("couldn't reach the server. try once more.");
      setStatus('error');
    }
  };

  const charsUsed = message.length;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title ? `Push back on ${title}` : 'Push back'}
      className="bg-paper text-ink max-w-lg w-full p-0 rounded-sm border border-ink/15 backdrop:bg-ink/60"
    >
      <div className="p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
            push back{title ? ` — ${title}` : ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 hover:text-ink"
          >
            [ close ]
          </button>
        </div>

        {status === 'success' ? (
          <p className="font-serif text-lg italic text-ink/80">
            Received. Thanks for the argument.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
                your pushback
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                required
                minLength={10}
                maxLength={2000}
                placeholder="tell me what you disagree with."
                className="w-full mt-2 bg-paper-2 border border-ink/15 px-3 py-2 font-mono text-sm focus:border-ruby focus:outline-none"
              />
              <span className="font-mono text-xs text-ink/40 mt-1 block">
                {charsUsed} / 2000
              </span>
            </label>

            <label className="block">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
                your name <span className="text-ink/40">(optional)</span>
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full mt-2 bg-paper-2 border border-ink/15 px-3 py-2 font-mono text-sm focus:border-ruby focus:outline-none"
              />
            </label>

            {/* Honeypot — bots fill this; humans don't see it. */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label>
                website
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            {errorText ? (
              <p role="alert" className="font-mono text-xs text-ruby">
                {errorText}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-ink/50 leading-relaxed">
                we store what you send until maria has reviewed it. we don&apos;t share it.
                no email, no newsletter — ever.
              </p>
              <button
                type="submit"
                disabled={status === 'submitting' || message.length < 10}
                className="font-mono text-xs uppercase tracking-[0.14em] border border-ruby px-4 py-2 text-ruby hover:bg-ruby hover:text-paper transition-colors motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {status === 'submitting' ? '[ sending… ]' : '[ send ]'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
