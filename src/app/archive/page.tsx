import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Fieldwork, Now } from '@/lib/content/types';
import { getFieldworkGroupedByStatus } from '@/lib/content/fieldwork';
import { listNowArchive } from '@/lib/content/now';
import { ArchiveSection } from '@/components/ArchiveSection';

export const metadata: Metadata = {
  title: 'Archive',
  description:
    'Retired fieldwork organised by status: still right, evolved, changed my mind. Plus past /now entries.',
};

function sortForArchive(pieces: Fieldwork[]): Fieldwork[] {
  return [...pieces].sort((a, b) => {
    const aKey = a.frontmatter.retiredAt ?? a.frontmatter.published;
    const bKey = b.frontmatter.retiredAt ?? b.frontmatter.published;
    return bKey.localeCompare(aKey);
  });
}

const fmtDate = (iso: string) => format(new Date(`${iso}T00:00:00Z`), 'd MMM yyyy');

function NowHistorySection({ entries }: { entries: Now[] }) {
  return (
    <section aria-labelledby="archive-now-past-months">
      <header className="mb-6 border-t border-ink/20 pt-4">
        <h2
          id="archive-now-past-months"
          className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60"
        >
          now · past months ({entries.length})
        </h2>
      </header>
      <ul className="space-y-5">
        {entries.map((entry) => {
          const { updated, currently } = entry.frontmatter;
          return (
            <li key={updated} className="flex flex-col gap-1">
              <Link
                href={`/now/${updated}`}
                className="font-serif text-xl italic leading-snug hover:underline"
              >
                {currently}
              </Link>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
                <time dateTime={updated}>{fmtDate(updated)}</time>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function ArchivePage() {
  const [groups, nowHistory] = await Promise.all([
    getFieldworkGroupedByStatus(),
    listNowArchive(),
  ]);
  const stillRight = sortForArchive(groups['retired-still-right']);
  const evolved = sortForArchive(groups['retired-evolved']);
  const changedMyMind = sortForArchive(groups['changed-my-mind']);

  const anyRetired = stillRight.length + evolved.length + changedMyMind.length > 0;
  const anyNowHistory = nowHistory.length > 0;
  const anything = anyRetired || anyNowHistory;

  return (
    <div className="max-w-3xl">
      <header className="mb-12">
        <h1 className="font-serif font-black text-5xl tracking-tight">Archive</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic leading-relaxed max-w-xl">
          Pieces I&apos;ve retired, evolved past, or changed my mind on — kept on the record so I
          can&apos;t pretend they didn&apos;t happen. Past /now entries live here too.
        </p>
      </header>

      {!anything ? (
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
          {anyNowHistory ? <NowHistorySection entries={nowHistory} /> : null}
        </div>
      )}
    </div>
  );
}
