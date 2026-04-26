import type { Metadata } from 'next';
import type { Fieldwork } from '@/lib/content/types';
import { getFieldworkGroupedByStatus } from '@/lib/content/fieldwork';
import { ArchiveSection } from '@/components/ArchiveSection';

export const metadata: Metadata = {
  title: 'Archive',
  description: 'Retired fieldwork organised by status: still right, evolved, changed my mind.',
};

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
          Pieces I&apos;ve retired, evolved past, or changed my mind on — kept on the record so I
          can&apos;t pretend they didn&apos;t happen.
        </p>
      </header>

      {!anyRetired ? (
        <p className="font-serif text-lg text-ink/70 italic leading-relaxed max-w-xl">
          Nothing retired yet. Come back when I&apos;ve changed my mind about something — which I
          will.
        </p>
      ) : (
        <div className="space-y-16">
          {stillRight.length > 0 ? (
            <ArchiveSection
              title="still right"
              pieces={stillRight}
              linkPattern="fieldwork"
              emptyMessage=""
            />
          ) : null}
          {evolved.length > 0 ? (
            <ArchiveSection
              title="evolved · refined"
              pieces={evolved}
              linkPattern="fieldwork"
              emptyMessage=""
            />
          ) : null}
          {changedMyMind.length > 0 ? (
            <ArchiveSection
              title="changed my mind"
              pieces={changedMyMind}
              linkPattern="changed-my-mind"
              emptyMessage=""
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
