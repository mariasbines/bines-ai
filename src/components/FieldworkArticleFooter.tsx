'use client';

import { useState } from 'react';
import { PushBackModal } from './PushBackModal';

interface FieldworkArticleFooterProps {
  slug: string;
  title: string;
}

/**
 * Client island appended to <FieldworkArticle>. A single "push back" CTA
 * at the end of the piece — lets readers respond without scrolling back
 * to the card.
 */
export function FieldworkArticleFooter({ slug, title }: FieldworkArticleFooterProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-12 pt-6 border-t border-ink/15 flex items-center justify-between">
        <p className="font-serif text-sm text-ink/60 italic">
          Disagree with any of that?
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-mono text-xs uppercase tracking-[0.14em] border border-accent px-3 py-1.5 text-accent hover:bg-accent hover:text-paper transition-colors motion-reduce:transition-none"
        >
          [ push back ]
        </button>
      </div>
      <PushBackModal
        open={open}
        onClose={() => setOpen(false)}
        slug={slug}
        title={title}
      />
    </>
  );
}
