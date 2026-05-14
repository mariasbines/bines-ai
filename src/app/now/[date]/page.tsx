import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { NowBlock } from '@/components/NowBlock';
import { getNowByDate, listNowArchive } from '@/lib/content/now';

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateStaticParams() {
  const archive = await listNowArchive();
  return archive.map((entry) => ({ date: entry.frontmatter.updated }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const entry = await getNowByDate(date);
  if (!entry) return {};
  return {
    title: `Now — ${entry.frontmatter.updated}`,
    description: entry.frontmatter.currently,
  };
}

export default async function ArchivedNowPage({ params }: PageProps) {
  const { date } = await params;
  const entry = await getNowByDate(date);
  if (!entry) notFound();

  return (
    <div className="max-w-3xl">
      <p className="mb-6 font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
        <Link href="/archive" className="underline decoration-ink/30 hover:decoration-ink">
          ← archive
        </Link>
        <span className="mx-2 text-ink/30">·</span>
        <Link href="/now" className="underline decoration-ink/30 hover:decoration-ink">
          current /now
        </Link>
      </p>
      <NowBlock now={entry} />
    </div>
  );
}
