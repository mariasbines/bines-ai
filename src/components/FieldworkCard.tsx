import Link from 'next/link';
import type { Fieldwork } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';
import { Metadata } from './Metadata';
import { FieldworkCardCtas } from './FieldworkCardCtas';

interface FieldworkCardProps {
  piece: Fieldwork;
}

/**
 * Homepage / feed card for a Fieldwork piece. Top strip "FIELDWORK NN · status",
 * title in Fraunces, metadata data-strip, CTA row. Per-piece jewel accent set
 * via --color-accent on the root. CTAs extracted into a small client island
 * (FieldworkCardCtas) that manages WatchDialog state.
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

      <FieldworkCardCtas piece={piece} />
    </article>
  );
}
