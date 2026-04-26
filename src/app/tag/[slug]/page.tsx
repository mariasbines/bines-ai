import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FieldworkCard } from '@/components/FieldworkCard';
import { PostcardCard } from '@/components/PostcardCard';
import { getAllTags, getPiecesByTag } from '@/lib/content/tags';

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `tag: ${slug}`,
    description: `Pieces on bines.ai tagged ${slug}.`,
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const allTags = await getAllTags();
  if (!allTags.includes(slug)) notFound();

  const { fieldwork, postcards } = await getPiecesByTag(slug);
  const total = fieldwork.length + postcards.length;

  return (
    <div className="max-w-3xl">
      <header className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/55 mb-3">
          tag
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">{slug}</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic leading-relaxed max-w-xl">
          {total === 1
            ? 'One piece on this thread.'
            : `${total} pieces on this thread.`}{' '}
          <Link
            href="/fieldwork"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            back to fieldwork
          </Link>
          .
        </p>
      </header>

      {fieldwork.length > 0 ? (
        <section aria-label="Fieldwork tagged" className="mb-12">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mb-4">
            fieldwork
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {fieldwork.map((piece) => (
              <FieldworkCard key={piece.frontmatter.slug} piece={piece} />
            ))}
          </div>
        </section>
      ) : null}

      {postcards.length > 0 ? (
        <section aria-label="Postcards tagged">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mb-4">
            postcards
          </h2>
          {postcards.map((pc) => (
            <PostcardCard key={pc.frontmatter.number} postcard={pc} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
