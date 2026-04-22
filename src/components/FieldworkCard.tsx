import Link from 'next/link';
import type { Fieldwork } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';
import { Metadata } from './Metadata';

interface FieldworkCardProps {
  piece: Fieldwork;
}

/**
 * Homepage / feed card for a Fieldwork piece. Top strip "FIELDWORK NN · status",
 * title in Fraunces, metadata data-strip, CTA row. Per-piece jewel accent set
 * via --color-accent on the root. No client JS.
 */
export function FieldworkCard({ piece }: FieldworkCardProps) {
  const { id, slug, title, status } = piece.frontmatter;
  const accent = accentFor(piece);
  const statusLabel =
    status === 'in-rotation'
      ? 'in rotation'
      : status === 'retired-still-right'
        ? 'retired · still right'
        : status === 'retired-evolved'
          ? 'retired · evolved'
          : 'changed my mind';
  const idPadded = id.toString().padStart(2, '0');

  return (
    <article
      className="border-t border-ink/15 pt-6 pb-10"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <div className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mb-4">
        <span className="text-accent">fieldwork {idPadded}</span>
        <span className="mx-2 text-ink/30" aria-hidden="true">
          ·
        </span>
        <span>{statusLabel}</span>
      </div>

      <h2 className="font-serif font-black text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-6">
        <Link
          href={`/fieldwork/${slug}`}
          className="hover:text-accent transition-colors motion-reduce:transition-none"
        >
          {title}
        </Link>
      </h2>

      <Metadata piece={piece} className="mb-6" />

      <div className="font-mono text-xs uppercase tracking-[0.14em] flex flex-wrap gap-3">
        <button
          type="button"
          data-fieldwork-cta="watch"
          disabled
          className="border border-ink/20 px-3 py-1.5 text-ink/40 cursor-not-allowed"
          aria-label="Watch video (coming in 001.013)"
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
    </article>
  );
}
