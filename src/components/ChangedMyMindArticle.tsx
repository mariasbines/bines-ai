import type { Fieldwork } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';
import { MdxBody } from './MdxBody';
import { RecantationVideo } from './RecantationVideo';

interface ChangedMyMindArticleProps {
  piece: Fieldwork; // must be status === 'changed-my-mind'
}

export function ChangedMyMindArticle({ piece }: ChangedMyMindArticleProps) {
  if (piece.frontmatter.status !== 'changed-my-mind') {
    throw new Error('ChangedMyMindArticle given a non-changed-my-mind piece');
  }
  const { title, supersedes, originalPosition, newPosition, media } = piece.frontmatter;
  const accent = accentFor(piece);
  const recantation = media.recantation;

  return (
    <article
      className="max-w-2xl mx-auto"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-6">
          changed my mind · superseding{' '}
          <a href={`/fieldwork/${supersedes}`} className="underline underline-offset-4">
            /fieldwork/{supersedes}
          </a>
        </div>

        <h1 className="font-serif font-black text-[clamp(2.125rem,5vw,3.375rem)] leading-[1.05] tracking-tight mb-10">
          {title}
        </h1>

        {recantation ? (
          <RecantationVideo
            src={recantation.src}
            poster={recantation.poster}
            captions={recantation.captions}
          />
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 border-y border-ink/15 py-6 mb-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mb-2">
              I used to think
            </p>
            <p className="font-serif text-lg italic text-ink/70">{originalPosition}</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent mb-2">
              now I think
            </p>
            <p className="font-serif text-lg italic">{newPosition}</p>
          </div>
        </div>
      </header>

      <div className="font-serif text-lg leading-relaxed [&_p]:my-5">
        <MdxBody source={piece.body} />
      </div>

      <footer className="mt-10 pt-6 border-t border-ink/15">
        <a
          href={`/fieldwork/${supersedes}`}
          className="font-mono text-xs uppercase tracking-[0.14em] text-accent hover:underline"
        >
          read the original →
        </a>
      </footer>
    </article>
  );
}
