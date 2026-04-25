import Link from 'next/link';
import { format } from 'date-fns';
import type { Postcard } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';
import { padNumber } from '@/lib/utils/number';
import { MdxBody } from './MdxBody';
import { Postmark } from './Postmark';

interface PostcardCardProps {
  postcard: Postcard;
  linkTitle?: boolean;
}

const fmtDateShort = (iso: string) =>
  format(new Date(`${iso}T00:00:00Z`), 'd MMM').toLowerCase();

export function PostcardCard({ postcard, linkTitle = true }: PostcardCardProps) {
  const { number, published } = postcard.frontmatter;
  const numPadded = padNumber(number);
  const accent = accentFor({
    frontmatter: { id: number, accent: postcard.frontmatter.accent },
  });

  const header = (
    <span className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
      postcard #{numPadded}
    </span>
  );

  return (
    <article
      className="relative bg-paper-2 border border-ink/15 rounded-sm px-6 py-7 sm:px-8 sm:py-8 mb-6 shadow-[0_1px_0_rgba(26,24,20,0.04)] border-l-[4px] border-l-accent motion-safe:transition-all motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <Postmark
        number={number}
        publishedISO={published}
        className="absolute top-3 right-4 sm:top-3 sm:right-5 text-accent opacity-80"
      />
      <header className="mb-4 pr-20 sm:pr-24">
        {linkTitle ? (
          <Link
            href={`/postcards/${numPadded}`}
            className="hover:opacity-80 transition-opacity motion-reduce:transition-none"
          >
            {header}
          </Link>
        ) : (
          header
        )}
      </header>

      <div className="font-serif text-base leading-relaxed [&_p]:my-3 [&_em]:italic">
        <MdxBody source={postcard.body} />
      </div>

      <p className="mt-5 font-mono text-xs text-ink/60 italic">
        maria · {fmtDateShort(published)}
      </p>
    </article>
  );
}
