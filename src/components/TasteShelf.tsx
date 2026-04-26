import { format } from 'date-fns';
import type { Taste } from '@/lib/content/types';
import { accentVar } from '@/lib/design/accent';
import { MdxBody } from './MdxBody';

interface TasteShelfProps {
  taste: Taste;
}

const fmtDate = (iso: string) => format(new Date(`${iso}T00:00:00Z`), 'd MMM yyyy');

export function TasteShelf({ taste }: TasteShelfProps) {
  const { updated, items, accent = 'amethyst' } = taste.frontmatter;
  return (
    <article
      className="max-w-2xl"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <header className="mb-10">
        <h1 className="font-serif font-black text-5xl tracking-tight mb-4">Taste</h1>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
          last updated <time dateTime={updated}>{fmtDate(updated)}</time>
        </p>
      </header>

      <div className="font-serif text-base text-ink/70 italic leading-relaxed mb-10 [&_p]:my-3">
        <MdxBody source={taste.body} />
      </div>

      <ul className="space-y-6 border-t border-ink/15 pt-6">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              {item.kind ? (
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                  {item.kind}
                </span>
              ) : null}
              {item.link ? (
                <a
                  href={item.link}
                  className="font-serif text-xl font-bold tracking-tight hover:text-accent transition-colors motion-reduce:transition-none"
                >
                  {item.title}
                </a>
              ) : (
                <span className="font-serif text-xl font-bold tracking-tight">{item.title}</span>
              )}
              {item.by ? (
                <span className="font-serif text-base text-ink/70">· {item.by}</span>
              ) : null}
            </div>
            {item.note ? (
              <p className="font-serif text-base text-ink/70 italic">{item.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
