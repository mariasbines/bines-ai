import { format } from 'date-fns';
import Link from 'next/link';
import type { Fieldwork } from '@/lib/content/types';
import { Fragment } from 'react';

interface MetadataProps {
  piece: Fieldwork;
  className?: string;
}

const fmtDate = (iso: string) => format(new Date(`${iso}T00:00:00Z`), 'd MMM yyyy');

/**
 * Data-strip used inside <FieldworkCard> and <FieldworkArticle>.
 * JetBrains Mono, dense grid of fields. No interactivity.
 */
export function Metadata({ piece, className }: MetadataProps) {
  const { published, media, pushback, changeMyMind, tags } = piece.frontmatter;
  const watchMin = media.watchMinutes;
  const mindCount = changeMyMind?.count ?? 0;
  return (
    <dl
      className={`font-mono text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 ${className ?? ''}`}
    >
      <dt className="text-ink/60">mused on</dt>
      <dd>
        <time dateTime={published}>{fmtDate(published)}</time>
      </dd>

      <dt className="text-ink/60">media</dt>
      <dd>
        {watchMin ? `watch ${watchMin} min  ·  ` : ''}read {media.readMinutes} min
      </dd>

      <dt className="text-ink/60">pushback</dt>
      <dd>
        {pushback.count} {pushback.count === 1 ? 'response' : 'responses'}
      </dd>

      <dt className="text-ink/60">change-my-mind</dt>
      <dd>{mindCount === 0 ? 'not yet' : `${mindCount}`}</dd>

      <dt className="text-ink/60">tags</dt>
      <dd>
        {tags.map((tag, i) => (
          <Fragment key={tag}>
            {i > 0 ? (
              <span aria-hidden="true" className="text-ink/30 mx-1">
                ·
              </span>
            ) : null}
            <Link
              href={`/tag/${tag}`}
              className="text-ink/85 hover:text-accent transition-colors motion-reduce:transition-none"
            >
              {tag}
            </Link>
          </Fragment>
        ))}
      </dd>
    </dl>
  );
}
