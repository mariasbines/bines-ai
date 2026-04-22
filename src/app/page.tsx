import { BioLine } from '@/components/BioLine';
import { FieldworkCard } from '@/components/FieldworkCard';
import { getAllFieldwork } from '@/lib/content/fieldwork';

export default async function Home() {
  const pieces = await getAllFieldwork({ status: 'in-rotation' });

  return (
    <div className="space-y-16">
      <BioLine />

      {pieces.length > 0 ? (
        <section aria-label="Fieldwork in rotation" className="grid gap-8 sm:grid-cols-2">
          {pieces.map((piece) => (
            <FieldworkCard key={piece.frontmatter.slug} piece={piece} />
          ))}
        </section>
      ) : (
        <p className="font-serif text-base text-ink/60 italic leading-relaxed">
          Fieldwork arriving soon. First piece lands with story 001.005; the{' '}
          <code className="font-mono text-ink/80">/argue</code> chat lands with 001.012.
        </p>
      )}
    </div>
  );
}
