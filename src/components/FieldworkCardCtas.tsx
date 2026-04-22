'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WatchDialog } from './WatchDialog';
import type { Fieldwork } from '@/lib/content/types';

interface FieldworkCardCtasProps {
  piece: Fieldwork;
}

/**
 * Client island inside <FieldworkCard> — manages the [ watch ] modal
 * state. Keeps the card body itself server-rendered.
 */
export function FieldworkCardCtas({ piece }: FieldworkCardCtasProps) {
  const [open, setOpen] = useState(false);
  const { slug, media, title } = piece.frontmatter;
  const hasTestimonial = !!(media.testimonial && media.posterFrame);

  return (
    <>
      <div className="font-mono text-xs uppercase tracking-[0.14em] flex flex-wrap gap-3">
        <button
          type="button"
          data-fieldwork-cta="watch"
          disabled={!hasTestimonial}
          onClick={() => hasTestimonial && setOpen(true)}
          className="border px-3 py-1.5 border-ink/20 text-ink/40 hover:text-accent hover:border-accent transition-colors motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed enabled:text-ink/80"
          aria-label={hasTestimonial ? 'Watch video testimonial' : 'Watch — no video for this piece'}
        >
          [ watch ]
        </button>
        <Link
          href={`/fieldwork/${slug}`}
          className="border border-accent px-3 py-1.5 text-accent hover:bg-accent hover:text-paper transition-colors motion-reduce:transition-none"
        >
          [ read ]
        </Link>
        <button
          type="button"
          data-fieldwork-cta="push-back"
          disabled
          className="border border-ink/20 px-3 py-1.5 text-ink/40 cursor-not-allowed"
          aria-label="Push back (coming in 001.014)"
        >
          [ push back ]
        </button>
      </div>
      {hasTestimonial ? (
        <WatchDialog
          open={open}
          onClose={() => setOpen(false)}
          src={media.testimonial!}
          poster={media.posterFrame!}
          captions={media.testimonialCaptions}
          title={`Watch: ${title}`}
        />
      ) : null}
    </>
  );
}
