import Link from 'next/link';
import { format } from 'date-fns';
import type { Fieldwork } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';

type LinkPattern = 'fieldwork' | 'changed-my-mind';

interface ArchiveSectionProps {
  title: string;
  pieces: Fieldwork[];
  linkPattern: LinkPattern;
  emptyMessage: string;
  className?: string;
}

const fmtDate = (iso: string) => format(new Date(`${iso}T00:00:00Z`), 'd MMM yyyy');

function hrefFor(pattern: LinkPattern, slug: string): string {
  return pattern === 'changed-my-mind' ? `/changed-my-mind/${slug}` : `/fieldwork/${slug}`;
}

function idFor(title: string): string {
  // Slugify — drop non-alphanumerics (including middot), collapse whitespace.
  return `archive-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function ArchiveSection({
  title,
  pieces,
  linkPattern,
  emptyMessage,
  className,
}: ArchiveSectionProps) {
  const count = pieces.length;
  const headingId = idFor(title);

  return (
    <section className={className} aria-labelledby={headingId}>
      <header className="mb-6 border-t border-ink/20 pt-4">
        <h2 id={headingId} className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
          {title} ({count})
        </h2>
      </header>

      {pieces.length === 0 ? (
        <p className="font-serif text-base text-ink/60 italic leading-relaxed">{emptyMessage}</p>
      ) : (
        <ul className="space-y-5">
          {pieces.map((piece) => {
            const accent = accentFor(piece);
            const when = piece.frontmatter.retiredAt ?? piece.frontmatter.published;
            const reason = piece.frontmatter.retiredReason;
            return (
              <li
                key={piece.frontmatter.slug}
                className="flex flex-col gap-1"
                style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
              >
                <Link
                  href={hrefFor(linkPattern, piece.frontmatter.slug)}
                  className="font-serif text-xl font-bold tracking-tight hover:text-accent transition-colors motion-reduce:transition-none"
                >
                  {piece.frontmatter.title}
                </Link>
                <p className="font-mono text-xs text-ink/60">
                  retired <time dateTime={when}>{fmtDate(when)}</time>
                  {reason ? ` · ${reason}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
