import type { Metadata } from 'next';
import { getFieldworkByStatus } from '@/lib/content/fieldwork';
import { ChangedMyMindCard } from '@/components/ChangedMyMindCard';

export const metadata: Metadata = {
  title: 'Changed my mind',
  description:
    'Pieces I was wrong about, on the record. Each one supersedes an earlier piece in the Fieldwork archive.',
};

export default async function ChangedMyMindIndexPage() {
  const pieces = await getFieldworkByStatus('changed-my-mind');

  return (
    <div className="max-w-3xl">
      <header className="mb-12">
        <h1 className="font-serif font-black text-5xl tracking-tight">Changed my mind</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic leading-relaxed max-w-xl">
          Things I was wrong about, on the record. Each one supersedes an earlier piece. The shape
          is the same: I used to think this; now I think that.
        </p>
      </header>

      {pieces.length === 0 ? (
        <p className="font-serif text-lg text-ink/70 italic leading-relaxed max-w-xl">
          Haven&apos;t changed my mind publicly yet — it&apos;ll be a whole thing when I do.
        </p>
      ) : (
        <div className="space-y-8">
          {pieces.map((piece) => (
            <ChangedMyMindCard key={piece.frontmatter.slug} piece={piece} />
          ))}
        </div>
      )}
    </div>
  );
}
