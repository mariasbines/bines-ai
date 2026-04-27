import { format } from 'date-fns';
import type { Now } from '@/lib/content/types';
import { accentVar } from '@/lib/design/accent';
import { MdxBody } from './MdxBody';

interface NowBlockProps {
  now: Now;
}

const fmtDate = (iso: string) => format(new Date(`${iso}T00:00:00Z`), 'd MMM yyyy');

export function NowBlock({ now }: NowBlockProps) {
  const { updated, currently, accent = 'topaz' } = now.frontmatter;
  return (
    <article
      className="max-w-2xl"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <header className="mb-10">
        <h1 className="font-serif font-black text-5xl tracking-tight mb-3">Now</h1>
        <p className="font-serif text-base text-ink/70 italic">
          The longer version of the line that runs at the top of every page. Edited monthly.
        </p>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
          last updated <time dateTime={updated}>{fmtDate(updated)}</time>
        </p>
      </header>

      <p className="font-serif text-2xl leading-snug text-accent italic mb-10">{currently}</p>

      <div className="font-serif text-lg leading-relaxed [&_p]:my-5">
        <MdxBody source={now.body} />
      </div>
    </article>
  );
}
