'use client';

import { useEffect, useRef } from 'react';
import { VideoLoop } from './VideoLoop';

interface WatchDialogProps {
  open: boolean;
  onClose: () => void;
  src: string;
  poster: string;
  captions?: string;
  title: string;
}

/**
 * Accessible modal for testimonial videos. Uses native <dialog> so focus
 * trap + Escape-to-close is browser-handled.
 */
export function WatchDialog({ open, onClose, src, poster, captions, title }: WatchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const handler = () => onClose();
    d.addEventListener('close', handler);
    return () => d.removeEventListener('close', handler);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="bg-paper text-ink max-w-3xl w-full p-0 rounded-sm border border-ink/15 backdrop:bg-ink/60"
    >
      <div className="p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 hover:text-ink"
          >
            [ close ]
          </button>
        </div>
        {open ? (
          <VideoLoop src={src} poster={poster} captions={captions} alt={title} priority />
        ) : null}
      </div>
    </dialog>
  );
}
