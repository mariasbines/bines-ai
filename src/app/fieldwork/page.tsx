import Link from 'next/link';
import { getAllFieldwork } from '@/lib/content/fieldwork';
import { FieldworkCard } from '@/components/FieldworkCard';

export default async function FieldworkIndex() {
  const inRotation = await getAllFieldwork({ status: 'in-rotation' });

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">Fieldwork</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic">
          What I&apos;m noticing while I build AI for a living. Some of it&apos;s about work. A lot of it isn&apos;t. Earlier pieces live in the{' '}
          <Link
            href="/archive"
            className="text-ruby underline decoration-ruby/40 underline-offset-4 hover:decoration-ruby motion-reduce:transition-none"
          >
            archive
          </Link>
          .
        </p>
      </header>

      {inRotation.length > 0 ? (
        <section aria-label="Fieldwork in rotation" className="grid gap-8 sm:grid-cols-2">
          {inRotation.map((piece) => (
            <FieldworkCard key={piece.frontmatter.slug} piece={piece} />
          ))}
        </section>
      ) : (
        <p className="font-serif text-base text-ink/60 italic leading-relaxed">
          Nothing in rotation right now — check back soon, or read earlier pieces in the{' '}
          <Link href="/archive" className="text-ruby underline decoration-ruby/40 underline-offset-4 hover:decoration-ruby">
            archive
          </Link>
          .
        </p>
      )}
    </div>
  );
}

export const metadata = {
  title: 'Fieldwork',
  description:
    'Long-form arguments, four to six in rotation. Diagnostic observations on AI × life from a practitioner.',
};
