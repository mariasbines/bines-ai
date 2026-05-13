'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WatchDialog } from './WatchDialog';
import type { Fieldwork } from '@/lib/content/types';

interface FieldworkCardCtasProps {
  piece: Fieldwork;
}

/**
 * Client island inside <FieldworkCard> — manages [ watch ] modal state.
 * Keeps the card body itself server-rendered.
 *
 * The card title remains the primary affordance into the detail page;
 * [ argue with this ] (story 003.008) opens the Argue chat with
 * `?from=<slug>` so the piece is captured by the chat-route preface
 * (story 003.002) and the resulting judge verdict is attributed back to
 * this piece (story 003.003 onward). The CTA appears on every Fieldwork
 * card regardless of testimonial presence or pushback count.
 */
export function FieldworkCardCtas({ piece }: FieldworkCardCtasProps) {
  const [watchOpen, setWatchOpen] = useState(false);
  const { media, title, slug } = piece.frontmatter;
  const hasTestimonial = !!(media.testimonial && media.posterFrame);

  return (
    <>
      <div className="font-mono text-xs uppercase tracking-[0.14em] flex flex-wrap gap-3">
        <Link
          href={`/argue?from=${slug}`}
          className="border px-3 py-1.5 border-ink/20 text-ink/80 hover:text-accent hover:border-accent transition-colors motion-reduce:transition-none"
        >
          [ argue with this ]
        </Link>
        {hasTestimonial ? (
          <button
            type="button"
            data-fieldwork-cta="watch"
            onClick={() => setWatchOpen(true)}
            className="border px-3 py-1.5 border-ink/20 text-ink/80 hover:text-accent hover:border-accent transition-colors motion-reduce:transition-none"
            aria-label="Watch video testimonial"
          >
            [ watch ]
          </button>
        ) : null}
      </div>
      {hasTestimonial ? (
        <WatchDialog
          open={watchOpen}
          onClose={() => setWatchOpen(false)}
          src={media.testimonial!}
          poster={media.posterFrame!}
          captions={media.testimonialCaptions}
          title={`Watch: ${title}`}
        />
      ) : null}
    </>
  );
}
