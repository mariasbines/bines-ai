import { getAllPostcards } from '@/lib/content/postcards';
import { PostcardCard } from '@/components/PostcardCard';

export default async function PostcardsIndex() {
  const postcards = await getAllPostcards();

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">Postcards</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic">
          Numbered observations. Short. One per card, most recent first.
        </p>
      </header>

      {postcards.length > 0 ? (
        <section aria-label="Postcards">
          {postcards.map((pc) => (
            <PostcardCard key={pc.frontmatter.number} postcard={pc} />
          ))}
        </section>
      ) : (
        <p className="font-serif text-base text-ink/60 italic leading-relaxed">
          No postcards yet. Postcard #001 lands with story 001.007.
        </p>
      )}
    </div>
  );
}
