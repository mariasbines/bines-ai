import Link from 'next/link';
import { BioLine } from '@/components/BioLine';
import { FieldworkCard } from '@/components/FieldworkCard';
import { PostcardCard } from '@/components/PostcardCard';
import { getAllFieldwork } from '@/lib/content/fieldwork';
import { getAllPostcards } from '@/lib/content/postcards';

export default async function Home() {
  const [fieldwork, postcards] = await Promise.all([
    getAllFieldwork({ status: 'in-rotation' }),
    getAllPostcards(),
  ]);
  const recentPostcards = postcards.slice(0, 3);

  return (
    <div className="space-y-16">
      <BioLine />

      {fieldwork.length > 0 ? (
        <section aria-label="Fieldwork in rotation" className="grid gap-8 sm:grid-cols-2">
          {fieldwork.map((piece) => (
            <FieldworkCard key={piece.frontmatter.slug} piece={piece} />
          ))}
        </section>
      ) : (
        <p className="font-serif text-base text-ink/60 italic leading-relaxed">
          Fieldwork arriving soon. First piece lands with story 001.005; the{' '}
          <code className="font-mono text-ink/80">/argue</code> chat lands with 001.012.
        </p>
      )}

      {recentPostcards.length > 0 ? (
        <section aria-label="Recent postcards">
          <header className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif font-black text-2xl tracking-tight">Recent postcards</h2>
            <Link
              href="/postcards"
              className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 hover:text-ink transition-colors motion-reduce:transition-none"
            >
              all →
            </Link>
          </header>
          {recentPostcards.map((pc) => (
            <PostcardCard key={pc.frontmatter.number} postcard={pc} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
