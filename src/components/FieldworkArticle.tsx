import type { Fieldwork } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';
import { Metadata } from './Metadata';
import { MdxBody } from './MdxBody';
import { VideoLoop } from './VideoLoop';
import { FieldworkArticleFooter } from './FieldworkArticleFooter';

interface FieldworkArticleProps {
  piece: Fieldwork;
}

export function FieldworkArticle({ piece }: FieldworkArticleProps) {
  const { id, slug, title, status, media } = piece.frontmatter;
  const accent = accentFor(piece);
  const idPadded = id.toString().padStart(2, '0');
  const isRetired = status === 'retired-still-right' || status === 'retired-evolved';
  const hasHeaderVideo = !!(media.headerVideo && media.posterFrame);

  return (
    <article
      className="max-w-2xl mx-auto"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mb-6">
          <span className="text-accent">fieldwork {idPadded}</span>
          <span className="mx-2 text-ink/30" aria-hidden="true">
            ·
          </span>
          <span>
            {status === 'in-rotation'
              ? 'in rotation'
              : status === 'changed-my-mind'
                ? 'changed my mind'
                : 'retired'}
          </span>
        </div>

        {hasHeaderVideo ? (
          <VideoLoop
            src={media.headerVideo!}
            poster={media.posterFrame!}
            captions={media.captions}
            alt={`Atmospheric loop header for ${title}`}
            priority
            className="mb-10"
          />
        ) : null}

        <h1 className="font-serif font-black text-[clamp(2.125rem,5vw,3.375rem)] leading-[1.05] tracking-tight mb-8">
          {title}
        </h1>

        <Metadata piece={piece} />

        {isRetired ? (
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
            retired —{' '}
            <a href="/archive" className="text-accent underline-offset-4 hover:underline">
              see archive
            </a>
          </p>
        ) : null}
      </header>

      <div className="prose-fieldwork font-serif text-lg leading-relaxed max-w-none [&_p]:my-5 [&_strong]:font-bold">
        <MdxBody source={piece.body} />
      </div>

      <FieldworkArticleFooter slug={slug} title={title} />
    </article>
  );
}
