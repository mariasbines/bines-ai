import type { Fieldwork } from '@/lib/content/types';
import { getFieldworkGroupedByStatus } from '@/lib/content/fieldwork';
import { ArchiveSection } from '@/components/ArchiveSection';

function sortForArchive(pieces: Fieldwork[]): Fieldwork[] {
  return [...pieces].sort((a, b) => {
    const aKey = a.frontmatter.retiredAt ?? a.frontmatter.published;
    const bKey = b.frontmatter.retiredAt ?? b.frontmatter.published;
    return bKey.localeCompare(aKey);
  });
}

export default async function ArchivePage() {
  const groups = await getFieldworkGroupedByStatus();
  const stillRight = sortForArchive(groups['retired-still-right']);
  const evolved = sortForArchive(groups['retired-evolved']);
  const changedMyMind = sortForArchive(groups['changed-my-mind']);

  const anyRetired = stillRight.length + evolved.length + changedMyMind.length > 0;

  return (
    <div className="max-w-3xl">
      <header className="mb-12">
        <h1 className="font-serif font-black text-5xl tracking-tight">Archive</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic leading-relaxed max-w-xl">
          Organised by status, not chronology. Fieldwork that&apos;s been retired sits here with a
          note on why. &quot;Changed my mind&quot; gets its own route.
        </p>
      </header>

      {!anyRetired ? (
        <p className="font-serif text-lg text-ink/70 italic leading-relaxed max-w-xl">
          Nothing retired yet. Come back when I&apos;ve changed my mind about something — which I
          will.
        </p>
      ) : (
        <div className="space-y-16">
          <ArchiveSection
            title="still right"
            pieces={stillRight}
            linkPattern="fieldwork"
            emptyMessage="Nothing still right in the archive yet."
          />
          <ArchiveSection
            title="evolved · refined"
            pieces={evolved}
            linkPattern="fieldwork"
            emptyMessage="Nothing evolved yet."
          />
          <ArchiveSection
            title="changed my mind"
            pieces={changedMyMind}
            linkPattern="changed-my-mind"
            emptyMessage="Haven't changed my mind publicly yet — it'll be a whole thing when I do."
          />
        </div>
      )}
    </div>
  );
}
