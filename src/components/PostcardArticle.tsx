import { format } from 'date-fns';
import type { Postcard } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';
import { padNumber } from '@/lib/utils/number';
import { MdxBody } from './MdxBody';

interface PostcardArticleProps {
  postcard: Postcard;
}

const fmtDateLong = (iso: string) =>
  format(new Date(`${iso}T00:00:00Z`), 'd MMM yyyy').toLowerCase();

export function PostcardArticle({ postcard }: PostcardArticleProps) {
  const { number, published } = postcard.frontmatter;
  const numPadded = padNumber(number);
  const accent = accentFor({
    frontmatter: { id: number, accent: postcard.frontmatter.accent },
  });

  return (
    <article
      className="max-w-2xl mx-auto"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <header className="mb-10">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          postcard #{numPadded}
        </span>
      </header>

      <div className="font-serif text-xl leading-relaxed [&_p]:my-5 [&_em]:italic">
        <MdxBody source={postcard.body} />
      </div>

      <p className="mt-10 font-mono text-sm text-ink/60 italic">
        maria · {fmtDateLong(published)}
      </p>
    </article>
  );
}
