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
 * The [ push back ] CTA is intentionally hidden until the v2 pushback
 * redesign ships — the modal-with-textarea was replaced by a piece-aware
 * Argue chat (see memory: project_bines_ai_pushback_v2.md).
 * /api/push-back endpoint and PushBackModal component remain in the
 * codebase but are unreachable from the UI.
 */
export function FieldworkCardCtas({ piece }: FieldworkCardCtasProps) {
  const [watchOpen, setWatchOpen] = useState(false);
  const { slug, media, title } = piece.frontmatter;
  const hasTestimonial = !!(media.testimonial && media.posterFrame);

  return (
    <>
      <div className="font-mono text-xs uppercase tracking-[0.14em] flex flex-wrap gap-3">
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
        <Link
          href={`/fieldwork/${slug}`}
          className="border border-accent px-3 py-1.5 text-accent hover:bg-accent hover:text-paper transition-colors motion-reduce:transition-none"
        >
          [ read ]
        </Link>
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
