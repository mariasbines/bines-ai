import Link from 'next/link';
import type { Fieldwork } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';

interface ChangedMyMindCardProps {
  piece: Fieldwork; // must be status === 'changed-my-mind'
}

/**
 * Index-page card for a `changed-my-mind` piece. Shows the title, the
 * `I used to think` / `now I think` pair, and the date. Title links to
 * `/changed-my-mind/[slug]`. Server-rendered.
 */
export function ChangedMyMindCard({ piece }: ChangedMyMindCardProps) {
  if (piece.frontmatter.status !== 'changed-my-mind') {
    throw new Error('ChangedMyMindCard given a non-changed-my-mind piece');
  }
  const { id, slug, title, originalPosition, newPosition } = piece.frontmatter;
  const accent = accentFor(piece);
  const idPadded = id.toString().padStart(2, '0');

  return (
    <article
      className="bg-paper-2 border border-ink/15 rounded-sm px-8 py-8 sm:px-10 sm:py-10 shadow-[0_1px_0_rgba(26,24,20,0.04)] border-t-[6px] border-t-accent motion-safe:transition-all motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <div className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mb-4">
        <span className="text-accent font-bold">fieldwork {idPadded}</span>
        <span className="mx-2 text-ink/30" aria-hidden="true">·</span>
        <span>changed my mind</span>
      </div>

      <h2 className="font-serif font-black text-3xl sm:text-4xl leading-[1.1] tracking-tight mb-6 break-words">
        <Link
          href={`/changed-my-mind/${slug}`}
          className="hover:text-accent transition-colors motion-reduce:transition-none"
        >
          {title}
        </Link>
      </h2>

      <div className="grid gap-5 sm:grid-cols-2 border-y border-ink/15 py-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mb-2">
            I used to think
          </p>
          <p className="font-serif text-base italic text-ink/70">{originalPosition}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent mb-2">
            now I think
          </p>
          <p className="font-serif text-base italic">{newPosition}</p>
        </div>
      </div>
    </article>
  );
}
